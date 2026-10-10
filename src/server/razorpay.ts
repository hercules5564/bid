import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { finalizePaidOrder, type GatewayPayResult } from "./orders";
import { settleCardTopup, maxTopupUsdt, usdtRate } from "./wallet";

/**
 * Card payments (credit/debit, UPI, netbanking) via Razorpay. Plain REST,
 * no SDK — same style as the Bybit module. Amounts are INR paise throughout
 * (Razorpay's native unit), so lots need no conversion.
 *
 * Setup: Razorpay dashboard (test mode works end-to-end, no real money) ->
 * RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET into .env. For webhooks, add
 * RAZORPAY_WEBHOOK_SECRET and point a webhook at
 * /api/payments/razorpay/webhook (event: payment.captured).
 * Docs: https://razorpay.com/docs/api/orders/ · https://razorpay.com/docs/webhooks/
 */

export function razorpayEnabled(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

/** Publishable key — safe to send to the browser for Checkout.js. */
export function razorpayKeyId(): string {
  return process.env.RAZORPAY_KEY_ID ?? "";
}

type RzpFail = { ok: false; code: string; message: string };

function authHeader(): string {
  const id = process.env.RAZORPAY_KEY_ID ?? "";
  const secret = process.env.RAZORPAY_KEY_SECRET ?? "";
  return "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");
}

async function rzp<T>(
  method: "GET" | "POST",
  path: string,
  body?: Record<string, unknown>
): Promise<{ ok: true; data: T } | RzpFail> {
  if (!razorpayEnabled()) {
    return { ok: false, code: "GATEWAY_DISABLED", message: "Card payments aren't configured yet." };
  }
  try {
    const res = await fetch(`https://api.razorpay.com/v1${path}`, {
      method,
      headers: { Authorization: authHeader(), "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = (await res.json().catch(() => null)) as { error?: { description?: string } } | T | null;
    if (!res.ok) {
      const desc =
        data && typeof data === "object" && "error" in data
          ? (data.error?.description ?? `Razorpay rejected the request (${res.status}).`)
          : `Razorpay rejected the request (${res.status}).`;
      return { ok: false, code: "GATEWAY_ERROR", message: desc };
    }
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, code: "GATEWAY_UNREACHABLE", message: "Couldn't reach Razorpay. Try again." };
  }
}

function safeEqual(a: string, b: string): boolean {
  try {
    const ab = Buffer.from(a, "utf8");
    const bb = Buffer.from(b, "utf8");
    return ab.length === bb.length && timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

/**
 * Verify a Checkout.js payment: HMAC-SHA256 of `order_id|payment_id`
 * with the key secret must equal `razorpay_signature`. Pure — unit-testable.
 */
export function verifyRazorpaySignature(input: {
  orderId: string;
  paymentId: string;
  signature: string | null | undefined;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET ?? "";
  if (!secret || !input.orderId || !input.paymentId || !input.signature) return false;
  const expected = createHmac("sha256", secret).update(`${input.orderId}|${input.paymentId}`).digest("hex");
  return safeEqual(expected, input.signature);
}

/** Verify a webhook call: HMAC-SHA256 of the raw body with the webhook secret. */
export function verifyRazorpayWebhook(rawBody: string, signature: string | null | undefined): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? "";
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
}

export type RzpOrder = { id: string; amount: number; currency: string; receipt: string; status: string };

/** Create a Razorpay order for a Gavl order. `receipt` is our order id (webhook maps back). */
export async function createRazorpayOrder(input: {
  orderId: string;
  amountPaise: number;
}): Promise<{ ok: true; order: RzpOrder } | RzpFail> {
  if (!Number.isInteger(input.amountPaise) || input.amountPaise < 100) {
    return { ok: false, code: "INVALID_AMOUNT", message: "Invalid order amount." };
  }
  const res = await rzp<RzpOrder>("POST", "/orders", {
    amount: input.amountPaise,
    currency: "INR",
    receipt: input.orderId,
    notes: { gavl_order: input.orderId },
  });
  if (!res.ok) return res;
  if (!res.data.id) return { ok: false, code: "GATEWAY_ERROR", message: "Razorpay returned an incomplete order." };
  return { ok: true, order: res.data };
}

export type RzpPayment = {
  id: string;
  order_id: string;
  status: string;
  amount: number;
  currency: string;
  captured: boolean;
};

/** Server-trusted payment state — never trust the browser about money. */
export async function fetchRazorpayPayment(paymentId: string): Promise<{ ok: true; payment: RzpPayment } | RzpFail> {
  if (!paymentId) return { ok: false, code: "INVALID", message: "Missing payment id." };
  const res = await rzp<RzpPayment>("GET", `/payments/${paymentId}`);
  if (!res.ok) return res;
  return { ok: true, payment: res.data };
}

function validContact(c: {
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  shipTo?: string;
}): boolean {
  return Boolean(c.contactName?.trim() && c.contactEmail?.trim() && c.contactPhone?.trim() && c.shipTo?.trim());
}

/**
 * Settle an order paid by card. Trust chain: our DB (ownership/status/amount)
 * + Checkout.js signature + a server-side fetch confirming Razorpay captured
 * the exact amount. Idempotent — an already-PAID order returns as-is.
 */
export async function settleRazorpayOrder(input: {
  orderId: string;
  userId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  shipTo?: string;
}): Promise<GatewayPayResult> {
  if (!input.userId) return { ok: false, code: "AUTH", message: "Sign in first." };

  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    select: { id: true, buyerId: true, status: true, amount: true },
  });
  if (!order) return { ok: false, code: "NOT_FOUND", message: "Order not found." };
  if (order.buyerId !== input.userId)
    return { ok: false, code: "FORBIDDEN", message: "You can't pay for someone else's order." };
  if (order.status === "PAID") {
    // Idempotent: polling/webhook retries land here.
    return finalizePaidOrder({
      orderId: order.id,
      buyerId: input.userId,
      provider: "razorpay",
      providerRef: input.razorpayPaymentId,
    });
  }
  if (order.status === "CANCELLED")
    return { ok: false, code: "CANCELLED", message: "This order was cancelled." };
  if (!validContact(input)) {
    return { ok: false, code: "INVALID", message: "Please fill in your contact + delivery details." };
  }

  if (!verifyRazorpaySignature({ orderId: input.razorpayOrderId, paymentId: input.razorpayPaymentId, signature: input.signature })) {
    return { ok: false, code: "MISMATCH", message: "Payment signature doesn't check out. Contact support." };
  }
  const pay = await fetchRazorpayPayment(input.razorpayPaymentId);
  if (!pay.ok) return pay;
  if (pay.payment.order_id !== input.razorpayOrderId || pay.payment.amount !== order.amount || !pay.payment.captured) {
    return { ok: false, code: "MISMATCH", message: "Payment doesn't match this order. Contact support." };
  }

  return finalizePaidOrder({
    orderId: order.id,
    buyerId: input.userId,
    provider: "razorpay",
    providerRef: pay.payment.id,
    contactName: input.contactName,
    contactEmail: input.contactEmail,
    contactPhone: input.contactPhone,
    shipTo: input.shipTo,
  });
}

/**
 * Create a Razorpay order that tops up a wallet. Receipt encodes
 * `topup:<userId>:<paise>:<timestamp>` so the webhook can credit it.
 * Cap mirrors the USDT top-up limit, converted at the display rate.
 */
export async function createRazorpayTopup(input: {
  userId: string;
  amountPaise: number;
}): Promise<{ ok: true; order: RzpOrder } | RzpFail> {
  if (!input.userId) return { ok: false, code: "AUTH", message: "Sign in first." };
  if (!Number.isInteger(input.amountPaise) || input.amountPaise < 100) {
    return { ok: false, code: "INVALID", message: "Minimum card top-up is ₹1." };
  }
  const maxPaise = Math.floor(maxTopupUsdt() * usdtRate() * 100);
  if (input.amountPaise > maxPaise) {
    return {
      ok: false,
      code: "TOO_LARGE",
      message: `Card top-ups are capped at ${maxTopupUsdt().toLocaleString("en-US")} USDT worth for now.`,
    };
  }
  const receipt = `topup:${input.userId}:${input.amountPaise}:${Date.now()}`;
  const res = await rzp<RzpOrder>("POST", "/orders", {
    amount: input.amountPaise,
    currency: "INR",
    receipt,
    notes: { gavl_topup: input.userId, gavl_amount: String(input.amountPaise) },
  });
  if (!res.ok) return res;
  if (!res.data.id) return { ok: false, code: "GATEWAY_ERROR", message: "Razorpay returned an incomplete order." };
  return { ok: true, order: res.data };
}

/** Settle a card wallet top-up after signature + server-side capture check. */
export async function settleRazorpayTopup(input: {
  userId: string;
  amountPaise: number;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature: string;
}): Promise<{ ok: true; balance: number } | RzpFail> {
  if (!input.userId) return { ok: false, code: "AUTH", message: "Sign in first." };
  if (!verifyRazorpaySignature({ orderId: input.razorpayOrderId, paymentId: input.razorpayPaymentId, signature: input.signature })) {
    return { ok: false, code: "MISMATCH", message: "Payment signature doesn't check out. Contact support." };
  }
  const pay = await fetchRazorpayPayment(input.razorpayPaymentId);
  if (!pay.ok) return pay;
  if (pay.payment.order_id !== input.razorpayOrderId || pay.payment.amount !== input.amountPaise || !pay.payment.captured) {
    return { ok: false, code: "MISMATCH", message: "Payment doesn't match this top-up. Contact support." };
  }
  const credited = await settleCardTopup({
    userId: input.userId,
    amountPaise: input.amountPaise,
    providerRef: `rzp:${pay.payment.id}`,
    note: "Card top-up via Razorpay",
  });
  if (!credited.ok) return credited;
  return { ok: true, balance: credited.balance };
}
