import { prisma } from "@/lib/prisma";
import { invalidate } from "@/lib/cache";
import { charge, isValidTronTxid, paymentProviderLabel, queryBybitPayment } from "./payments";
import { notify } from "./notifications";
import type { Prisma, OrderStatus } from "@prisma/client";

const ORDER_SELECT = {
  id: true,
  buyerId: true,
  amount: true,
  status: true,
  paidAt: true,
  createdAt: true,
  contactName: true,
  contactEmail: true,
  contactPhone: true,
  shipTo: true,
  txRef: true,
  provider: true,
  providerRef: true,
  review: { select: { rating: true, comment: true } },
  dispute: { select: { id: true, status: true } },
  listing: {
    select: {
      id: true,
      title: true,
      images: true,
      category: { select: { name: true } },
      seller: { select: { id: true, handle: true, name: true, avatar: true } },
    },
  },
} satisfies Prisma.OrderSelect;

export type OrderDTO = {
  id: string;
  amount: number;
  status: OrderStatus;
  paidAt: string | null;
  createdAt: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  shipTo: string | null;
  txRef: string | null;
  provider: string | null;
  providerRef: string | null;
  review: { rating: number; comment: string | null } | null;
  dispute: { id: string; status: string } | null;
  listing: {
    id: string;
    title: string;
    image: string | null;
    categoryName: string;
    seller: { id: string; handle: string; name: string; avatar: string | null };
  };
};

function toDTO(o: Prisma.OrderGetPayload<{ select: typeof ORDER_SELECT }>): OrderDTO {
  return {
    id: o.id,
    amount: o.amount,
    status: o.status,
    paidAt: o.paidAt?.toISOString() ?? null,
    createdAt: o.createdAt.toISOString(),
    contactName: o.contactName,
    contactEmail: o.contactEmail,
    contactPhone: o.contactPhone,
    shipTo: o.shipTo,
    txRef: o.txRef,
    provider: o.provider,
    providerRef: o.providerRef,
    review: o.review,
    dispute: o.dispute,
    listing: {
      id: o.listing.id,
      title: o.listing.title,
      image: o.listing.images[0] ?? null,
      categoryName: o.listing.category.name,
      seller: o.listing.seller,
    },
  };
}

/**
 * Fetch a single order for checkout. Scope it to the buyer (or seller / admin)
 * so nobody can poke at someone else's order via a guessed id.
 */
export async function getOrderForCheckout(orderId: string, userId: string) {
  const o = await prisma.order.findUnique({
    where: { id: orderId },
    select: ORDER_SELECT,
  });
  if (!o) return null;
  if (o.listing.seller.id !== userId && o.buyerId !== userId) return null;
  return toDTO(o);
}

/** The current user's recent orders, newest first. */
export async function getUserOrders(userId: string, limit = 40): Promise<OrderDTO[]> {
  const rows = await prisma.order.findMany({
    where: { buyerId: userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: ORDER_SELECT,
  });
  return rows.map(toDTO);
}

export async function getSellerOrders(userId: string, limit = 40): Promise<OrderDTO[]> {
  const rows = await prisma.order.findMany({
    where: { sellerId: userId, status: { in: ["PAID", "CANCELLED"] } },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: ORDER_SELECT,
  });
  return rows.map(toDTO);
}

/** Order for a specific listing, scoped to the viewer (buyer or seller). Null
 *  if no order exists or the viewer isn't a party to it. */
export async function getOrderForListing(listingId: string, userId: string) {
  const o = await prisma.order.findUnique({
    where: { listingId },
    select: ORDER_SELECT,
  });
  if (!o) return null;
  if (o.buyerId !== userId && o.listing.seller.id !== userId) return null;
  return toDTO(o);
}

export type PayOrderInput = {
  orderId: string;
  userId: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  shipTo?: string;
  /** Tron txid proving the buyer sent USDT to escrow. */
  txRef?: string;
};

export type PayOrderResult =
  | { ok: true; order: OrderDTO }
  | { ok: false; code: string; message: string };

/**
 * Complete checkout: verify ownership + status, validate the charge with the
 * payment provider, then atomically flip the order to PAID. If the provider
 * rejects, we leave the order PENDING and surface the error.
 */
export async function payOrder(input: PayOrderInput): Promise<PayOrderResult> {
  if (!input.userId) return { ok: false, code: "AUTH", message: "Sign in first." };

  if (
    !input.contactName?.trim() ||
    !input.contactEmail?.trim() ||
    !input.contactPhone?.trim() ||
    !input.shipTo?.trim()
  ) {
    return { ok: false, code: "INVALID", message: "Please fill in your contact + delivery details." };
  }

  if (!isValidTronTxid(input.txRef)) {
    return {
      ok: false,
      code: "INVALID_TXREF",
      message: "Send the USDT to the escrow address first, then paste the 64-character transaction hash.",
    };
  }

  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    select: {
      id: true,
      buyerId: true,
      status: true,
      amount: true,
      listing: { select: { id: true, title: true } },
    },
  });
  if (!order) return { ok: false, code: "NOT_FOUND", message: "Order not found." };
  if (order.buyerId !== input.userId)
    return { ok: false, code: "FORBIDDEN", message: "You can't pay for someone else's order." };
  if (order.status === "PAID")
    return { ok: false, code: "ALREADY_PAID", message: "This order is already paid." };
  if (order.status === "CANCELLED")
    return { ok: false, code: "CANCELLED", message: "This order was cancelled." };

  // 1. Verify the buyer's transfer proof with the payment provider.
  const charge_ = await charge({
    amount: order.amount,
    description: `Gavl · ${order.listing.title}`,
    contactEmail: input.contactEmail,
    contactPhone: input.contactPhone,
    txRef: input.txRef.trim(),
  });
  if (!charge_.ok) return charge_;

  // 2. Persist the completed sale (shared with the gateway flow below).
  return finalizePaidOrder({
    orderId: order.id,
    buyerId: order.buyerId,
    provider: "sandbox",
    providerRef: charge_.txRef,
    txRef: charge_.txRef,
    contactName: input.contactName,
    contactEmail: input.contactEmail,
    contactPhone: input.contactPhone,
    shipTo: input.shipTo,
  });
}

export type SettleInput = {
  orderId: string;
  buyerId: string;
  provider: string;
  providerRef: string;
  /** Legacy USDT txid column — kept populated for the manual escrow flow. */
  txRef?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  shipTo?: string | null;
};

/**
 * Flip a PENDING order to PAID in one shot (idempotent via status guard),
 * then notify buyer + seller. Shared by the USDT flow and the Razorpay
 * verify/webhook handlers. Contact fields are optional so the webhook —
 * which has no form data — can still settle.
 */
export async function finalizePaidOrder(input: SettleInput): Promise<PayOrderResult> {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    select: {
      id: true,
      buyerId: true,
      status: true,
      listing: { select: { id: true, title: true } },
    },
  });
  if (!order) return { ok: false, code: "NOT_FOUND", message: "Order not found." };
  if (order.buyerId !== input.buyerId)
    return { ok: false, code: "FORBIDDEN", message: "You can't pay for someone else's order." };
  if (order.status === "PAID") {
    const existing = await prisma.order.findUnique({ where: { id: order.id }, select: ORDER_SELECT });
    if (!existing) return { ok: false, code: "NOT_FOUND", message: "Order not found." };
    return { ok: true, order: toDTO(existing) };
  }
  if (order.status === "CANCELLED")
    return { ok: false, code: "CANCELLED", message: "This order was cancelled." };

  const data: Prisma.OrderUpdateInput = {
    status: "PAID",
    paidAt: new Date(),
    provider: input.provider,
    providerRef: input.providerRef,
  };
  if (input.txRef) data.txRef = input.txRef;
  if (input.contactName) data.contactName = input.contactName;
  if (input.contactEmail) data.contactEmail = input.contactEmail;
  if (input.contactPhone) data.contactPhone = input.contactPhone;
  if (input.shipTo) data.shipTo = input.shipTo;

  const updated = await prisma.order.update({
    where: { id: order.id },
    data,
    select: { ...ORDER_SELECT, buyer: { select: { id: true, handle: true } } },
  });

  invalidate(`orders:${input.buyerId}`, `orders:seller:${updated.listing.seller.id}`);

  const refShort = input.providerRef.length > 18 ? `${input.providerRef.slice(0, 10)}…` : input.providerRef;
  await notify({
    userId: order.buyerId,
    type: "ORDER_PAID",
    title: "Payment complete 🎉",
    body: `You paid for "${order.listing.title}". Ref ${refShort} — check your orders for the details.`,
    listingId: order.listing.id,
  });
  await notify({
    userId: updated.listing.seller.id,
    type: "ORDER_PAID",
    title: "Sale confirmed",
    body: `A buyer paid for "${order.listing.title}".`,
    listingId: order.listing.id,
  });

  const dto = toDTO(updated as never);
  return { ok: true, order: dto };
}

export type GatewayPayResult = PayOrderResult;

/**
 * Settle an order paid through Bybit Pay. The ONLY source of truth is a
 * server-side query to Bybit for our order id — the client merely tells us
 * to go check. Safe to poll/retry: an already-PAID order returns as-is.
 */
export async function settleBybitPayment(input: {
  orderId: string;
  userId: string;
  payId?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  shipTo?: string;
}): Promise<GatewayPayResult> {
  if (!input.userId) return { ok: false, code: "AUTH", message: "Sign in first." };

  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    select: { id: true, buyerId: true, status: true },
  });
  if (!order) return { ok: false, code: "NOT_FOUND", message: "Order not found." };
  if (order.buyerId !== input.userId)
    return { ok: false, code: "FORBIDDEN", message: "You can't pay for someone else's order." };
  if (order.status === "PAID") {
    const existing = await prisma.order.findUnique({ where: { id: order.id }, select: ORDER_SELECT });
    if (!existing) return { ok: false, code: "NOT_FOUND", message: "Order not found." };
    return { ok: true, order: toDTO(existing) };
  }
  if (order.status === "CANCELLED")
    return { ok: false, code: "CANCELLED", message: "This order was cancelled." };

  if (
    !input.contactName?.trim() ||
    !input.contactEmail?.trim() ||
    !input.contactPhone?.trim() ||
    !input.shipTo?.trim()
  ) {
    return { ok: false, code: "INVALID", message: "Please fill in your contact + delivery details." };
  }

  // Ask Bybit directly — never trust the browser about money.
  const status = await queryBybitPayment(order.id);
  if (!status.ok) return status;
  if (input.payId && status.payId !== input.payId) {
    return { ok: false, code: "MISMATCH", message: "Payment doesn't match this order. Contact support." };
  }
  if (status.status !== "PAY_SUCCESS") {
    return {
      ok: false,
      code: "NOT_PAID_YET",
      message:
        status.status === "TIMEOUT"
          ? "This payment expired. Go back and generate a fresh Bybit QR."
          : "Bybit hasn't confirmed the payment yet — scan the QR in your Bybit app, then retry.",
    };
  }

  return finalizePaidOrder({
    orderId: order.id,
    buyerId: input.userId,
    provider: "bybit",
    providerRef: status.payId,
    contactName: input.contactName,
    contactEmail: input.contactEmail,
    contactPhone: input.contactPhone,
    shipTo: input.shipTo,
  });
}

export type CancelOrderResult = { ok: true } | { ok: false; code: string; message: string };

export async function cancelOrder(orderId: string, userId: string): Promise<CancelOrderResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { buyerId: true, status: true, sellerId: true },
  });
  if (!order) return { ok: false, code: "NOT_FOUND", message: "Order not found." };
  if (order.sellerId === userId) {
    // Seller can only cancel a still-pending order.
    if (order.status !== "PENDING")
      return { ok: false, code: "NOT_PENDING", message: "Only pending orders can be cancelled." };
  } else if (order.buyerId === userId) {
    if (order.status !== "PENDING")
      return { ok: false, code: "NOT_PENDING", message: "Only pending orders can be cancelled." };
  } else {
    return { ok: false, code: "FORBIDDEN", message: "You can't cancel this order." };
  }

  await prisma.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
  invalidate(`orders:${userId}`, `orders:seller:${order.sellerId}`);
  return { ok: true };
}

export function activeProviderLabel() {
  return paymentProviderLabel();
}