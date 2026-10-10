import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { razorpayEnabled, settleRazorpayTopup } from "@/server/razorpay";

export const dynamic = "force-dynamic";

const str = (v: unknown) => (typeof v === "string" ? v : "");

/** Settle a card wallet top-up after Checkout.js. */
export async function POST(req: NextRequest) {
  const uid = await getSessionUserId();
  if (!uid) return NextResponse.json({ ok: false, code: "AUTH", message: "Sign in first." }, { status: 401 });
  if (!razorpayEnabled()) {
    return NextResponse.json({ ok: false, code: "GATEWAY_DISABLED", message: "Card payments aren't configured." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const result = await settleRazorpayTopup({
    userId: uid,
    amountPaise: Math.floor(Number(body?.amountPaise)),
    razorpayOrderId: str(body?.razorpayOrderId),
    razorpayPaymentId: str(body?.razorpayPaymentId),
    signature: str(body?.signature),
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
