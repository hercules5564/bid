import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Public conversion rate for dual-currency display (₹ ↔ USDT).
 * Reads BYBIT_USDT_INR_RATE; falls back to 90 and flags it as an estimate.
 * Also exposes the per-top-up cap (WALLET_MAX_TOPUP_USDT, default 10000).
 */
export async function GET() {
  const raw = Number(process.env.BYBIT_USDT_INR_RATE);
  const estimated = !Number.isFinite(raw) || raw <= 0;
  const capRaw = Number(process.env.WALLET_MAX_TOPUP_USDT ?? "10000");
  const maxTopupUsdt = Number.isFinite(capRaw) && capRaw > 0 ? capRaw : 10000;
  return NextResponse.json({ ok: true, inrPerUsdt: estimated ? 90 : raw, estimated, maxTopupUsdt });
}
