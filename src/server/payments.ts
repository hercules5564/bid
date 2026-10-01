import "server-only";

/**
 * Payment gateway seam. Gavl ships with a sandbox provider so the full
 * order lifecycle works end-to-end without API keys; swap real providers in
 * here (Stripe / Razorpay / Cashfree) without touching the rest of the app.
 */

export type PaymentResult =
  | { ok: true; txRef: string; provider: string }
  | { ok: false; code: string; message: string };

export type ChargeInput = {
  amount: number; // paise
  description: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  /** Buyer-supplied proof of the escrow transfer (Tron txid). */
  txRef?: string | null;
};

/** Tron transaction ids are 64 lowercase/uppercase hex chars. */
export function isValidTronTxid(v: string | null | undefined): v is string {
  return typeof v === "string" && /^[a-fA-F0-9]{64}$/.test(v.trim());
}

function providerName(): string {
  return process.env.PAYMENT_PROVIDER ?? "sandbox";
}

/**
 * Verify the buyer's escrow transfer and return its reference, or a
 * structured error for the checkout UI to render. The sandbox validates the
 * transaction-hash format (and NEVER moves real money); swapping in a real
 * provider means verifying the txid on-chain (TronGrid / provider webhook)
 * right here before returning ok:true.
 */
export async function charge(input: ChargeInput): Promise<PaymentResult> {
  const provider = providerName();

  // No money moves without proof of transfer — regardless of provider.
  if (!isValidTronTxid(input.txRef)) {
    return {
      ok: false,
      code: "INVALID_TXREF",
      message: "Paste the 64-character USDT transaction hash from your wallet after sending to the escrow address.",
    };
  }
  const txRef = input.txRef.trim();

  if (provider !== "sandbox") {
    // TODO(gateway): implement provider SDK calls here (create payment intent /
    //   order, verify webhook signature, confirm capture). Docs:
    //   Stripe:  https://stripe.com/docs/payments/payment-intents
    //   Razorpay: https://razorpay.com/docs/payments/payment-gateway/
    // The Order.status transitions (PENDING -> PAID) already assume an
    // asynchronous webhook-confirmed flow, so this seam is where you'd
    // 1) create the payment session, 2) on webhook, mark the Order paid.
    return {
      ok: false,
      code: "PROVIDER_NOT_CONFIGURED",
      message: `The "${provider}" provider isn't wired up yet. Set PAYMENT_PROVIDER=sandbox to accept payments locally.`,
    };
  }

  // Sandbox: accepts the buyer's txid as the reference, never moves money.
  await new Promise((r) => setTimeout(r, 350 + Math.random() * 400));
  return { ok: true, txRef, provider };
}

/** Human-facing label for the active provider (shown on the checkout page). */
export function paymentProviderLabel(): string {
  const p = providerName();
  if (p === "sandbox") return "USDT escrow (TRC20) · 5% platform fee · demo mode, no real money yet";
  return p;
}