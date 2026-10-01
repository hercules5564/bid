export type ScoringMetric = "WINNING_VALUE" | "BID_VOLUME" | "BID_COUNT";

const num = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/**
 * Server-authoritative auction tuning. Nothing here is ever read from the client.
 */
export const auctionConfig = {
  antiSnipeWindowSeconds: num(process.env.ANTISNIPE_WINDOW_SECONDS, 30),
  endingSoonSeconds: num(process.env.ENDING_SOON_SECONDS, 300),
  showdownDurationHours: num(process.env.SHOWDOWN_DURATION_HOURS, 168),
  scoringMetric: ((process.env.SCORING_METRIC as ScoringMetric) || "WINNING_VALUE") as ScoringMetric,
};

// Default live window per duration type, in milliseconds.
export const DURATION_MS: Record<string, number> = {
  HOURLY: 3 * 60 * 60 * 1000, // flash default — admin can override 1–6h
  DAILY: 24 * 60 * 60 * 1000,
  WEEKLY: 7 * 24 * 60 * 60 * 1000,
  WEEKLY_SHOWDOWN: auctionConfig.showdownDurationHours * 60 * 60 * 1000,
};

export const SCORING_LABEL: Record<ScoringMetric, string> = {
  WINNING_VALUE: "Value of winning bids",
  BID_VOLUME: "Total bid volume",
  BID_COUNT: "Number of bids",
};

/**
 * USDT escrow + platform fee. Buyer pays Gavl, Gavl pays seller after delivery.
 * Only USDT is accepted (no BTC/ETH for now).
 */
export const escrowConfig = {
  // 5% platform fee — deducted from seller payout after delivery.
  feePercent: num(process.env.PLATFORM_FEE_PERCENT, 5),
  // Your receiving address (Bybit USDT-TRC20). Empty until you paste it in .env.
  usdtAddress: process.env.ESCROW_USDT_ADDRESS ?? "",
  network: process.env.ESCROW_NETWORK ?? "TRC20 (Tron)",
  currency: "USDT",
};

/** Split a sale (paise) into platform fee + seller payout. */
export function splitFee(amountPaise: number) {
  const fee = Math.round((amountPaise * escrowConfig.feePercent) / 100);
  return { fee, sellerPayout: amountPaise - fee, feePercent: escrowConfig.feePercent };
}
