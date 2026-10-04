// ₹ (paise) ↔ USDT conversion for display. Rate comes from /api/rate
// (BYBIT_USDT_INR_RATE, fallback 90 flagged as estimate). Always an
// approximation — chain rate moves; the paise figure is authoritative.

let cache: Promise<RateInfo> | null = null;

export type RateInfo = { inrPerUsdt: number; maxTopupUsdt: number };

export function getRateInfo(): Promise<RateInfo> {
  if (!cache) {
    cache = fetch("/api/rate")
      .then((r) => r.json())
      .then((d) => ({
        inrPerUsdt:
          Number.isFinite(Number(d?.inrPerUsdt)) && Number(d.inrPerUsdt) > 0 ? Number(d.inrPerUsdt) : 90,
        maxTopupUsdt:
          Number.isFinite(Number(d?.maxTopupUsdt)) && Number(d.maxTopupUsdt) > 0
            ? Number(d.maxTopupUsdt)
            : 10000,
      }))
      .catch(() => ({ inrPerUsdt: 90, maxTopupUsdt: 10000 }));
  }
  return cache;
}

export function getInrPerUsdt(): Promise<number> {
  return getRateInfo().then((r) => r.inrPerUsdt);
}

/** "1,234.50" style USDT figure for a paise amount. Empty when uncomputable. */
export function usdtString(paise: number, inrPerUsdt: number): string {
  if (!Number.isFinite(paise) || !Number.isFinite(inrPerUsdt) || inrPerUsdt <= 0) return "";
  const usdt = paise / 100 / inrPerUsdt;
  return usdt.toLocaleString("en-US", { maximumFractionDigits: usdt >= 100 ? 2 : 4 });
}
