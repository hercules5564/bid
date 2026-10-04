import { prisma } from "@/lib/prisma";
import { bybitEnabled, queryBybitPayment, refundBybitPayment } from "./payments";
import { refundToWallet } from "./wallet";
import { notify } from "./notifications";
import type { DisputeStatus } from "@prisma/client";

export const DISPUTE_REASONS = [
  "Item not delivered",
  "Item not as described",
  "Item arrived damaged",
  "Seller unresponsive",
  "Something else",
] as const;

export type DisputeDTO = {
  id: string;
  orderId: string;
  reason: string;
  details: string;
  status: DisputeStatus;
  resolution: string | null;
  createdAt: string;
  resolvedAt: string | null;
  listing: { id: string; title: string };
  buyer: { id: string; handle: string; name: string };
  seller: { id: string; handle: string; name: string };
};

type Row = {
  id: string;
  orderId: string;
  reason: string;
  details: string;
  status: DisputeStatus;
  resolution: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
  order: {
    listing: { id: string; title: string };
    buyer: { id: string; handle: string; name: string };
    seller: { id: string; handle: string; name: string };
  };
};

function toDTO(d: Row): DisputeDTO {
  return {
    id: d.id,
    orderId: d.orderId,
    reason: d.reason,
    details: d.details,
    status: d.status,
    resolution: d.resolution,
    createdAt: d.createdAt.toISOString(),
    resolvedAt: d.resolvedAt?.toISOString() ?? null,
    listing: d.order.listing,
    buyer: d.order.buyer,
    seller: d.order.seller,
  };
}

const DISPUTE_INCLUDE = {
  order: {
    select: {
      listing: { select: { id: true, title: true } },
      buyer: { select: { id: true, handle: true, name: true } },
      seller: { select: { id: true, handle: true, name: true } },
    },
  },
} as const;

export type OpenDisputeResult =
  | { ok: true; dispute: DisputeDTO }
  | { ok: false; code: string; message: string };

/**
 * Buyer raises a dispute on a PAID order. One open dispute per order — a
 * resolved dispute may not be re-opened (buyer can contact support instead).
 */
export async function openDispute(input: {
  orderId: string;
  userId: string;
  reason: string;
  details: string;
}): Promise<OpenDisputeResult> {
  if (!input.userId) return { ok: false, code: "AUTH", message: "Sign in first." };
  const reason = input.reason.trim().slice(0, 80);
  const details = input.details.trim().slice(0, 2000);
  if (!reason) return { ok: false, code: "INVALID", message: "Pick a reason for the dispute." };
  if (details.length < 10)
    return { ok: false, code: "INVALID", message: "Describe the problem in at least 10 characters." };

  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    select: {
      id: true,
      buyerId: true,
      sellerId: true,
      status: true,
      listingId: true,
      listing: { select: { title: true } },
      dispute: { select: { id: true, status: true } },
    },
  });
  if (!order) return { ok: false, code: "NOT_FOUND", message: "Order not found." };
  if (order.buyerId !== input.userId)
    return { ok: false, code: "FORBIDDEN", message: "Only the buyer can dispute this order." };
  if (order.status !== "PAID")
    return { ok: false, code: "NOT_PAID", message: "Only paid orders can be disputed." };
  if (order.dispute && order.dispute.status === "OPEN")
    return { ok: false, code: "ALREADY_OPEN", message: "A dispute is already open for this order." };
  if (order.dispute)
    return { ok: false, code: "ALREADY_RESOLVED", message: "This dispute was already resolved." };

  try {
    const dispute = await prisma.dispute.create({
      data: {
        orderId: order.id,
        raisedById: input.userId,
        reason,
        details,
      },
      include: DISPUTE_INCLUDE,
    });

    await notify({
      userId: order.sellerId,
      type: "DISPUTE_OPENED",
      title: "⚠️ Buyer opened a dispute",
      body: `"${order.listing.title}": ${reason}. Respond to the buyer or await review.`,
      listingId: order.listingId,
    });

    return { ok: true, dispute: toDTO(dispute) };
  } catch (e) {
    if (e && typeof e === "object" && (e as { code?: string }).code === "P2002") {
      return { ok: false, code: "ALREADY_OPEN", message: "A dispute is already open for this order." };
    }
    throw e;
  }
}

/** Buyer cancels their own still-OPEN dispute. */
export async function cancelDispute(disputeId: string, userId: string) {
  const d = await prisma.dispute.findUnique({
    where: { id: disputeId },
    select: { id: true, raisedById: true, status: true },
  });
  if (!d) return { ok: false as const, code: "NOT_FOUND", message: "Dispute not found." };
  if (d.raisedById !== userId) return { ok: false as const, code: "FORBIDDEN", message: "Not your dispute." };
  if (d.status !== "OPEN")
    return { ok: false as const, code: "NOT_OPEN", message: "Only an open dispute can be withdrawn." };
  await prisma.dispute.update({ where: { id: d.id }, data: { status: "CANCELLED" } });
  return { ok: true as const };
}

export type ResolveDisputeResult = { ok: true } | { ok: false; code: string; message: string };

/**
 * Admin resolves an OPEN dispute.
 * - "refund": buyer gets money back — order flips to CANCELLED and the refund
 *   transfer reference is stored in `resolution` (money moves manually via the
 *   same escrow path as checkout; the txid here is the proof).
 * - "reject": the sale stands — order stays PAID.
 */
export async function resolveDispute(input: {
  disputeId: string;
  adminId: string;
  outcome: "refund" | "reject";
  resolution: string;
  refundTxRef?: string;
}): Promise<ResolveDisputeResult> {
  const admin = await prisma.user.findUnique({ where: { id: input.adminId }, select: { role: true } });
  if (admin?.role !== "ADMIN") return { ok: false, code: "FORBIDDEN", message: "Admins only." };

  const note = input.resolution.trim().slice(0, 2000);
  if (note.length < 5) return { ok: false, code: "INVALID", message: "Write a short resolution note." };

  const d = await prisma.dispute.findUnique({
    where: { id: input.disputeId },
    select: {
      id: true,
      status: true,
      reason: true,
      orderId: true,
      order: {
        select: {
          buyerId: true,
          sellerId: true,
          status: true,
          provider: true,
          providerRef: true,
          listingId: true,
          listing: { select: { title: true } },
        },
      },
    },
  });
  if (!d) return { ok: false, code: "NOT_FOUND", message: "Dispute not found." };
  if (d.status !== "OPEN")
    return { ok: false, code: "NOT_OPEN", message: "This dispute is already resolved." };

  const status: DisputeStatus = input.outcome === "refund" ? "RESOLVED_REFUNDED" : "RESOLVED_REJECTED";
  const refundTx = input.refundTxRef?.trim() || null;
  if (input.outcome === "refund" && refundTx && !/^[a-fA-F0-9]{64}$/.test(refundTx)) {
    return { ok: false, code: "INVALID_TXREF", message: "Refund txid must be 64 hex characters." };
  }

  // Refunds move real money, fastest path first:
  // 1. wallet-paid order → instant wallet credit, no chain involved;
  // 2. Bybit-paid order → Bybit refund API (exact paid amount, proof back);
  // 3. pasted txid → admin refunded manually off-band, record it as-is.
  let resolution = note;
  if (input.outcome === "refund") {
    if (d.order.provider === "wallet") {
      resolution = `${note} [refunded to wallet]`;
    } else if (refundTx) {
      resolution = `${note} [manual refund tx ${refundTx}]`;
    } else if (bybitEnabled() && d.order.provider === "bybit" && d.order.providerRef) {
      const pay = await queryBybitPayment(d.orderId);
      if (!pay.ok) {
        return {
          ok: false,
          code: "REFUND_LOOKUP_FAILED",
          message: `Couldn't read the Bybit payment (${pay.message}). Paste a manual refund txid instead.`,
        };
      }
      const merchantRefundNo = `RF-${d.id.slice(-8)}-${Date.now().toString(36)}`;
      const refund = await refundBybitPayment({
        payId: d.order.providerRef,
        merchantRefundNo,
        refundAmountUsdt: pay.amount,
      });
      if (!refund.ok) {
        return {
          ok: false,
          code: "REFUND_FAILED",
          message: `Bybit refund failed (${refund.message}). Retry or paste a manual refund txid.`,
        };
      }
      resolution = `${note} [bybit refund ${refund.refundId} · ${pay.amount} USDT]`;
    } else {
      resolution = `${note} [manual refund — record the txid with the buyer]`;
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.dispute.update({
      where: { id: d.id },
      data: { status, resolution, resolvedAt: new Date(), resolvedById: input.adminId },
    });
    // A refunded order leaves the PAID set so it can't be reviewed or disputed again.
    if (input.outcome === "refund") {
      await tx.order.update({ where: { id: d.orderId }, data: { status: "CANCELLED" } });
      if (d.order.provider === "wallet") {
        const full = await tx.order.findUnique({ where: { id: d.orderId }, select: { amount: true } });
        if (full) {
          await refundToWallet(tx as never, {
            userId: d.order.buyerId,
            amount: full.amount,
            orderId: d.orderId,
            note: `Dispute refund — ${d.reason}`,
          });
        }
      }
    }
  });

  const title = d.order.listing.title;
  await notify({
    userId: d.order.buyerId,
    type: "DISPUTE_RESOLVED",
    title: input.outcome === "refund" ? "Dispute resolved — refunded ✅" : "Dispute resolved",
    body: input.outcome === "refund" ? `"${title}": refund issued. ${note}` : `"${title}": ${note}`,
    listingId: d.order.listingId,
  });
  await notify({
    userId: d.order.sellerId,
    type: "DISPUTE_RESOLVED",
    title: "Dispute resolved",
    body: `"${title}": ${input.outcome === "refund" ? "refunded to buyer. " : "sale upheld. "}${note}`,
    listingId: d.order.listingId,
  });

  return { ok: true };
}

/** Open disputes for the admin panel, newest first. */
export async function listDisputes(status: DisputeStatus | "ALL" = "OPEN"): Promise<DisputeDTO[]> {
  const rows = await prisma.dispute.findMany({
    where: status === "ALL" ? {} : { status },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: DISPUTE_INCLUDE,
  });
  return rows.map(toDTO);
}
