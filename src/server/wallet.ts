import { prisma } from "@/lib/prisma";
import { isValidTronTxid, charge } from "./payments";
import { notify } from "./notifications";
import type { Prisma, WalletTxType } from "@prisma/client";

/**
 * Buyer wallet: prepaid balance (paise) with per-listing holds.
 *
 * - Bids lock funds via holdForBid() inside the bid transaction: a bid is
 *   only accepted when balance - held covers it.
 * - Being outbid releases the old leader's hold; winning captures it, so the
 *   lot auto-pays with no checkout step.
 * - Top-ups come from the same manual USDT escrow flow as checkout (txid +
 *   declared amount — production would verify amount + ownership on-chain).
 *
 * SHOWCASE NOTE: balances here are demo funds. Holding real user money at
 * scale is a regulated activity (RBI PPI in India) — get legal advice first.
 */

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export type WalletState = {
  balance: number;
  held: number;
  available: number;
  txns: {
    id: string;
    type: WalletTxType;
    amount: number;
    balanceAfter: number;
    heldAfter: number;
    listingId: string | null;
    orderId: string | null;
    note: string | null;
    createdAt: string;
  }[];
};

/** Lock the wallet row FOR UPDATE (creating a zero wallet on first use). */
async function lockWallet(tx: Tx, userId: string) {
  const rows = await tx.$queryRaw<{ id: string; balance: number; held: number }[]>`
    SELECT id, balance, held FROM "Wallet" WHERE "userId" = ${userId} FOR UPDATE
  `;
  if (rows[0]) return rows[0];
  const created = await tx.wallet.create({ data: { userId, balance: 0, held: 0 } });
  return { id: created.id, balance: 0, held: 0 };
}

async function logTxn(
  tx: Tx,
  input: {
    userId: string;
    type: WalletTxType;
    amount: number;
    balanceAfter: number;
    heldAfter: number;
    listingId?: string;
    orderId?: string;
    providerRef?: string;
    note?: string;
  }
) {
  await tx.walletTransaction.create({
    data: {
      userId: input.userId,
      type: input.type,
      amount: input.amount,
      balanceAfter: input.balanceAfter,
      heldAfter: input.heldAfter,
      listingId: input.listingId,
      orderId: input.orderId,
      providerRef: input.providerRef,
      note: input.note,
    },
  });
}

export type HoldResult = { ok: true } | { ok: false; code: "INSUFFICIENT"; available: number };

/**
 * Hold `amount` for a bid. Any previous hold by this user on the same listing
 * counts toward coverage (re-hold replaces it). Call INSIDE the bid/buy-now
 * transaction, after the listing row is locked.
 */
export async function holdForBid(
  tx: Tx,
  input: { userId: string; listingId: string; amount: number }
): Promise<HoldResult> {
  const w = await lockWallet(tx, input.userId);
  const prev = await tx.walletHold.findUnique({
    where: { userId_listingId: { userId: input.userId, listingId: input.listingId } },
  });
  const prevAmount = prev?.amount ?? 0;
  const available = w.balance - w.held + prevAmount;
  if (available < input.amount) {
    return { ok: false, code: "INSUFFICIENT", available: Math.max(0, available) };
  }
  const diff = input.amount - prevAmount;
  await tx.walletHold.upsert({
    where: { userId_listingId: { userId: input.userId, listingId: input.listingId } },
    update: { amount: input.amount },
    create: { userId: input.userId, listingId: input.listingId, amount: input.amount },
  });
  if (diff !== 0) {
    await tx.wallet.update({ where: { id: w.id }, data: { held: w.held + diff } });
    await logTxn(tx, {
      userId: input.userId,
      type: prev ? "HOLD_INCREASE" : "HOLD",
      amount: Math.abs(diff),
      balanceAfter: w.balance,
      heldAfter: w.held + diff,
      listingId: input.listingId,
      note: prev ? "Bid raised — hold increased" : "Bid placed — funds held",
    });
  }
  return { ok: true };
}

/** Release a user's hold on a listing (outbid). No-op when nothing is held. */
export async function releaseHold(tx: Tx, input: { userId: string; listingId: string }) {
  const prev = await tx.walletHold.findUnique({
    where: { userId_listingId: { userId: input.userId, listingId: input.listingId } },
  });
  if (!prev) return;
  const w = await lockWallet(tx, input.userId);
  await tx.walletHold.delete({ where: { id: prev.id } });
  await tx.wallet.update({ where: { id: w.id }, data: { held: Math.max(0, w.held - prev.amount) } });
  await logTxn(tx, {
    userId: input.userId,
    type: "RELEASE",
    amount: prev.amount,
    balanceAfter: w.balance,
    heldAfter: Math.max(0, w.held - prev.amount),
    listingId: input.listingId,
    note: "Outbid — hold released",
  });
}

/**
 * Capture the winner's hold: money leaves the wallet for good. Returns the
 * captured amount (0 when there was no hold, e.g. bids predating wallets —
 * callers fall back to manual checkout then).
 */
export async function captureHold(
  tx: Tx,
  input: { userId: string; listingId: string; orderId?: string }
): Promise<{ captured: number }> {
  const prev = await tx.walletHold.findUnique({
    where: { userId_listingId: { userId: input.userId, listingId: input.listingId } },
  });
  if (!prev) return { captured: 0 };
  const w = await lockWallet(tx, input.userId);
  await tx.walletHold.delete({ where: { id: prev.id } });
  await tx.wallet.update({
    where: { id: w.id },
    data: { balance: w.balance - prev.amount, held: Math.max(0, w.held - prev.amount) },
  });
  await logTxn(tx, {
    userId: input.userId,
    type: "CAPTURE",
    amount: prev.amount,
    balanceAfter: w.balance - prev.amount,
    heldAfter: Math.max(0, w.held - prev.amount),
    listingId: input.listingId,
    orderId: input.orderId,
    note: "Won — funds deducted",
  });
  return { captured: prev.amount };
}

/** Credit a manual refund straight back to the wallet (dispute flow). */
export async function refundToWallet(
  tx: Tx,
  input: { userId: string; amount: number; orderId: string; note: string }
) {
  const w = await lockWallet(tx, input.userId);
  await tx.wallet.update({ where: { id: w.id }, data: { balance: w.balance + input.amount } });
  await logTxn(tx, {
    userId: input.userId,
    type: "REFUND",
    amount: input.amount,
    balanceAfter: w.balance + input.amount,
    heldAfter: w.held,
    orderId: input.orderId,
    note: input.note,
  });
}

export type TopUpResult =
  | { ok: true; balance: number }
  | { ok: false; code: string; message: string };

/** Max single top-up in USDT (showcase cap). Override with WALLET_MAX_TOPUP_USDT. */
function maxTopupUsdt(): number {
  const v = Number(process.env.WALLET_MAX_TOPUP_USDT ?? "10000");
  return Number.isFinite(v) && v > 0 ? v : 10000;
}

function usdtRate(): number {
  const rate = Number(process.env.BYBIT_USDT_INR_RATE);
  return Number.isFinite(rate) && rate > 0 ? rate : 90;
}

/**
 * Top up with the manual USDT escrow flow: buyer sends USDT to the house
 * address, declares the rupee amount + txid. The txid can never be reused.
 * Production would verify amount + ownership on-chain (TronGrid) here.
 */
export async function topUpWithTxid(input: {
  userId: string;
  rupees: number;
  txRef: string;
}): Promise<TopUpResult> {
  if (!input.userId) return { ok: false, code: "AUTH", message: "Sign in first." };
  const paise = Math.floor(Number(input.rupees) * 100);
  if (!Number.isFinite(paise) || paise <= 0) {
    return { ok: false, code: "INVALID", message: "Enter a valid top-up amount." };
  }
  if (paise > Number.MAX_SAFE_INTEGER) {
    return { ok: false, code: "INVALID", message: "Enter a valid top-up amount." };
  }
  // Cap is denominated in USDT (wallets are USDT-first)
  if (paise / 100 / usdtRate() > maxTopupUsdt()) {
    return { ok: false, code: "TOO_LARGE", message: `Top-ups are capped at ${maxTopupUsdt().toLocaleString("en-US")} USDT for now.` };
  }
  if (!isValidTronTxid(input.txRef)) {
    return {
      ok: false,
      code: "INVALID_TXREF",
      message: "Send the USDT to the escrow address first, then paste the 64-character transaction hash.",
    };
  }
  const txRef = input.txRef.trim();

  // Format-check the transfer proof with the payment provider (sandbox:
  // format only, never moves money — same as checkout).
  const proof = await charge({ amount: paise, description: "Gavl wallet top-up", txRef });
  if (!proof.ok) return proof;

  try {
    const balance = await prisma.$transaction(async (tx) => {
      const w = await lockWallet(tx, input.userId);
      const used = await tx.walletTransaction.findFirst({ where: { providerRef: txRef } });
      if (used) throw new Error("TXID_REUSED");
      await tx.wallet.update({ where: { id: w.id }, data: { balance: w.balance + paise } });
      await logTxn(tx, {
        userId: input.userId,
        type: "TOPUP",
        amount: paise,
        balanceAfter: w.balance + paise,
        heldAfter: w.held,
        providerRef: txRef,
        note: "USDT escrow top-up",
      });
      return w.balance + paise;
    });
    await notify({
      userId: input.userId,
      type: "WALLET_TOPUP",
      title: "Wallet topped up 💰",
      body: `₹${Math.round(paise / 100).toLocaleString("en-IN")} added. You're ready to bid.`,
    });
    return { ok: true, balance };
  } catch (e) {
    if (e instanceof Error && e.message === "TXID_REUSED") {
      return { ok: false, code: "REUSED_TXREF", message: "This transaction hash was already used for a top-up." };
    }
    throw e;
  }
}

/** Demo starting balance for new signups (paise). Zero disables the bonus. */
export function signupBonusPaise(): number {
  const rupees = Number(process.env.WALLET_SIGNUP_BONUS_RUPEES ?? "50000");
  if (!Number.isFinite(rupees) || rupees <= 0) return 0;
  return Math.floor(rupees * 100);
}

/** Grant the signup bonus right after user creation. Idempotent per user. */
export async function grantSignupBonus(userId: string) {
  const bonus = signupBonusPaise();
  if (bonus <= 0) return;
  await prisma.$transaction(async (tx) => {
    const existing = await tx.wallet.findUnique({ where: { userId } });
    if (existing) return;
    const w = await tx.wallet.create({ data: { userId, balance: bonus, held: 0 } });
    await logTxn(tx, {
      userId,
      type: "BONUS",
      amount: bonus,
      balanceAfter: w.balance,
      heldAfter: 0,
      note: "Welcome bonus (demo funds)",
    });
  });
}

/** Wallet + recent ledger for the dashboard. Auto-creates an empty wallet. */
export async function getWalletState(userId: string): Promise<WalletState> {
  const w = await prisma.wallet.upsert({
    where: { userId },
    update: {},
    create: { userId, balance: 0, held: 0 },
  });
  const txns = await prisma.walletTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      type: true,
      amount: true,
      balanceAfter: true,
      heldAfter: true,
      listingId: true,
      orderId: true,
      note: true,
      createdAt: true,
    },
  });
  return {
    balance: w.balance,
    held: w.held,
    available: Math.max(0, w.balance - w.held),
    txns: txns.map((t) => ({ ...t, createdAt: t.createdAt.toISOString() })),
  };
}
