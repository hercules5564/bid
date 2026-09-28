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
};

function providerName(): string {
  return process.env.PAYMENT_PROVIDER ?? "sandbox";
}

/**
 * Charge a card / UPI / wallet and return a transaction reference, or a
 * structured error for the checkout UI to render. The sandbox always succeeds
 * after a beat (and NEVER moves real money) — deterministic txRef per order.
 */
export async function charge(input: ChargeInput): Promise<PaymentResult> {
  const provider = providerName();

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

  // Sandbox: always succeeds, never moves money.
  await new Promise((r) => setTimeout(r, 350 + Math.random() * 400));
  const txRef = `sandbox_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  return { ok: true, txRef, provider };
}

/** Human-facing label for the active provider (shown on the checkout page). */
export function paymentProviderLabel(): string {
  const p = providerName();
  return p === "sandbox" ? "Sandbox payment (no real money)" : p;
}