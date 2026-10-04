import "server-only";
import { createSign, createVerify } from "crypto";

/**
 * Payment gateway seam. Gavl ships with a sandbox provider so the full
 * order lifecycle works end-to-end without API keys; set the Bybit Pay env
 * vars to accept real USDT payments through your Bybit merchant account
 * alongside the manual escrow flow.
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
  if (p === "sandbox") return "USDT escrow to our Bybit address (TRC20) · 5% platform fee · demo mode, no real money yet";
  return p;
}

// ---------------------------------------------------------------------------
// Bybit Pay (real USDT payments through your Bybit merchant account).
// The buyer scans a QR / opens a checkout link in their Bybit app; Bybit
// notifies us via webhook and we settle the order server-side.
// Official docs: https://bybit-exchange.github.io/pay-docs/ (scan-payment)
// No SDK dependency — plain REST + RSA-SHA256 signatures with node:crypto.
// NOTE: Bybit Pay needs merchant onboarding (merchantId + API key after KYB).
// Until then the manual USDT escrow flow above keeps working unchanged.
// ---------------------------------------------------------------------------

const bybitBase = () => process.env.BYBIT_PAY_BASE_URL || "https://api.bybit.com";

/** True when the server can talk to Bybit Pay (merchant credentials present). */
export function bybitEnabled(): boolean {
  return Boolean(
    process.env.BYBIT_PAY_API_KEY &&
      process.env.BYBIT_PAY_MERCHANT_ID &&
      process.env.BYBIT_PAY_PRIVATE_KEY
  );
}

const pem = (v: string | undefined) => (v ?? "").replace(/\\n/g, "\n").trim();

/** Sign `${timestamp}${body}` with our RSA private key (base64). Timestamp is ms for API calls. */
export function signBybitRequest(timestamp: string, body: string): string | null {
  const key = pem(process.env.BYBIT_PAY_PRIVATE_KEY);
  if (!key) return null;
  try {
    return createSign("RSA-SHA256").update(timestamp + body).sign(key, "base64");
  } catch {
    return null;
  }
}

/**
 * Verify a Bybit webhook: `signature` over `${timestamp}${rawBody}` with
 * Bybit's platform RSA public key. Timestamp header is Unix seconds.
 */
export function verifyBybitWebhook(input: {
  timestamp: string | null;
  rawBody: string;
  signature: string | null;
}): boolean {
  const key = pem(process.env.BYBIT_PAY_PLATFORM_PUBLIC_KEY);
  if (!key || !input.timestamp || !input.signature) return false;
  try {
    return createVerify("RSA-SHA256")
      .update(input.timestamp + input.rawBody)
      .verify(key, input.signature, "base64");
  } catch {
    return false;
  }
}

type BybitEnvelope<T> = { retCode: number; retMsg: string; result: T };

async function bybitRequest<T>(
  method: "GET" | "POST",
  path: string,
  query: Record<string, string> | null,
  body: Record<string, unknown> | null
): Promise<{ ok: true; data: T } | { ok: false; code: string; message: string }> {
  if (!bybitEnabled()) {
    return { ok: false, code: "GATEWAY_DISABLED", message: "Bybit Pay isn't configured yet." };
  }
  const apiKey = process.env.BYBIT_PAY_API_KEY!;
  const timestamp = Date.now().toString();
  // GET requests sign the unescaped query string; our values are URL-safe.
  const qs = query ? "?" + Object.entries(query).map(([k, v]) => `${k}=${v}`).join("&") : "";
  const bodyStr = body ? JSON.stringify(body) : "";
  const signature = signBybitRequest(timestamp, method === "GET" ? qs.slice(1) : bodyStr);
  if (!signature) {
    return { ok: false, code: "BAD_KEY", message: "Bybit private key is invalid." };
  }
  try {
    const res = await fetch(`${bybitBase()}${path}${qs}`, {
      method,
      headers: {
        "X-BAPI-API-KEY": apiKey,
        "X-BAPI-TIMESTAMP": timestamp,
        "X-BAPI-RECV-WINDOW": "5000",
        "X-BAPI-SIGN": signature,
        "Content-Type": "application/json",
      },
      body: body ? bodyStr : undefined,
    });
    const data = (await res.json().catch(() => null)) as BybitEnvelope<T> | null;
    // Pay-docs examples return retCode 100000 on success (V5 core uses 0).
    if (!data || (data.retCode !== 0 && data.retCode !== 100000)) {
      return {
        ok: false,
        code: "GATEWAY_ERROR",
        message: data?.retMsg ?? `Bybit rejected the request (${res.status}).`,
      };
    }
    return { ok: true, data: data.result };
  } catch {
    return { ok: false, code: "GATEWAY_UNREACHABLE", message: "Couldn't reach Bybit. Try again." };
  }
}

/**
 * Convert integer paise (INR) to a USDT amount string using the configured
 * rate. Rate comes from BYBIT_USDT_INR_RATE (₹ per USDT) — set it from your
 * Bybit P2P/funding rate and update as the market moves.
 */
export function usdtAmountForPaise(
  paise: number
): { ok: true; usdt: string } | { ok: false; code: string; message: string } {
  const rate = Number(process.env.BYBIT_USDT_INR_RATE);
  if (!Number.isFinite(rate) || rate <= 0) {
    return {
      ok: false,
      code: "NO_RATE",
      message: "USDT conversion rate isn't configured (BYBIT_USDT_INR_RATE).",
    };
  }
  if (!Number.isInteger(paise) || paise <= 0) {
    return { ok: false, code: "INVALID_AMOUNT", message: "Invalid order amount." };
  }
  const usdt = paise / 100 / rate;
  // Up to 6 decimals, trailing zeros stripped ("100", "50.5").
  return { ok: true, usdt: usdt.toFixed(6).replace(/\.?0+$/, "") };
}

export type BybitPaymentResult =
  | { ok: true; payId: string; qrContent: string; checkoutLink: string; expireTime: number; usdtAmount: string }
  | { ok: false; code: string; message: string };

/**
 * Create a Bybit Pay QR payment. `merchantTradeNo` is our order id, so the
 * webhook/query responses map back without extra state. Expires in 1h (max).
 */
export async function createBybitPayment(input: {
  orderId: string;
  amountPaise: number;
  title: string;
  buyerEmail?: string;
  buyerName?: string;
  successUrl: string;
  failedUrl: string;
  webhookUrl: string;
}): Promise<BybitPaymentResult> {
  const merchantId = process.env.BYBIT_PAY_MERCHANT_ID ?? "";
  if (!merchantId) {
    return { ok: false, code: "GATEWAY_DISABLED", message: "Bybit Pay isn't configured yet." };
  }
  const amount = usdtAmountForPaise(input.amountPaise);
  if (!amount.ok) return amount;

  const body = {
    merchantId,
    merchantName: "Gavl",
    paymentType: "E_COMMERCE",
    merchantTradeNo: input.orderId,
    orderAmount: amount.usdt,
    currency: "USDT",
    currencyType: "crypto",
    successUrl: input.successUrl,
    failedUrl: input.failedUrl,
    webhookUrl: input.webhookUrl,
    orderExpireTime: Math.floor(Date.now() / 1000) + 3600,
    remark: `Gavl order ${input.orderId}`.slice(0, 50),
    customer: {
      externalUserId: input.buyerEmail || input.orderId,
      userName: (input.buyerName || "Gavl buyer").slice(0, 60),
    },
    goods: [
      {
        shoppingName: "Gavl",
        mccCode: process.env.BYBIT_PAY_MCC_CODE || "5999",
        goodsName: input.title.slice(0, 100),
        goodsDetail: "Auction lot",
      },
    ],
    env: { terminalType: "WEB" },
  };

  const res = await bybitRequest<{
    payId: string;
    expireTime: number;
    checkoutLink: string;
    qrContent: string;
  }>("POST", "/v5/bybitpay/create_pay", null, body);
  if (!res.ok) return res;
  if (!res.data.payId || !res.data.qrContent) {
    return { ok: false, code: "GATEWAY_ERROR", message: "Bybit returned an incomplete payment." };
  }
  return {
    ok: true,
    payId: res.data.payId,
    qrContent: res.data.qrContent,
    checkoutLink: res.data.checkoutLink,
    expireTime: res.data.expireTime,
    usdtAmount: amount.usdt,
  };
}

export type BybitStatusResult =
  | { ok: true; status: string; amount: string; payId: string; currency: string }
  | { ok: false; code: string; message: string };

/** Query a Bybit payment by our order id (server-trusted source of truth). */
export async function queryBybitPayment(merchantTradeNo: string): Promise<BybitStatusResult> {
  const merchantId = process.env.BYBIT_PAY_MERCHANT_ID ?? "";
  if (!merchantId) {
    return { ok: false, code: "GATEWAY_DISABLED", message: "Bybit Pay isn't configured yet." };
  }
  const res = await bybitRequest<{
    payId: string;
    status: string;
    amount: string;
    currency: string;
  }>("GET", "/v5/bybitpay/pay_result", { merchantId, paymentType: "E_COMMERCE", merchantTradeNo }, null);
  if (!res.ok) return res;
  return {
    ok: true,
    status: res.data.status,
    amount: res.data.amount,
    payId: res.data.payId,
    currency: res.data.currency,
  };
}

export type BybitRefundResult =
  | { ok: true; refundId: string; refundStatus: string }
  | { ok: false; code: string; message: string };

/** Refund a Bybit payment in full (used by the dispute flow). Amount is exact USDT paid. */
export async function refundBybitPayment(input: {
  payId: string;
  merchantRefundNo: string;
  refundAmountUsdt: string;
}): Promise<BybitRefundResult> {
  const merchantId = process.env.BYBIT_PAY_MERCHANT_ID ?? "";
  if (!merchantId) {
    return { ok: false, code: "GATEWAY_DISABLED", message: "Bybit Pay isn't configured yet." };
  }
  const res = await bybitRequest<{
    refundOrders: { refundId: string; refundStatus: string }[];
  }>("POST", "/v5/bybitpay/refund", null, {
    merchantId,
    list: [
      {
        refundType: "MERCHNT_SELF_REFUND",
        payId: input.payId,
        merchantRefundNo: input.merchantRefundNo,
        refundAmount: input.refundAmountUsdt,
        env: { terminalType: "WEB" },
      },
    ],
  });
  if (!res.ok) return res;
  const first = res.data.refundOrders?.[0];
  if (!first?.refundId) {
    return { ok: false, code: "GATEWAY_ERROR", message: "Bybit returned an incomplete refund." };
  }
  return { ok: true, refundId: first.refundId, refundStatus: first.refundStatus };
}