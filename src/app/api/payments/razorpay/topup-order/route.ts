import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { razorpayEnabled, razorpayKeyId, createRazorpayTopup } from "@/server/razorpay";

export const dynamic = "force-dynamic";

/** Create a Razorpay order that tops up the caller's wallet (amount in paise). */
export async function POST(req: NextRequest) {
  const uid = await getSessionUserId();
  if (!uid) return NextResponse.json({ ok: false, code: "AUTH", message: "Sign in first." }, { status: 401 });
  if (!razorpayEnabled()) {
    return NextResponse.json({ ok: false, code: "GATEWAY_DISABLED", message: "Card payments aren't configured." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const amountPaise = Math.floor(Number(body?.amountPaise));
  const topup = await createRazorpayTopup({ userId: uid, amountPaise });
  if (!topup.ok) return NextResponse.json(topup, { status: 400 });
  return NextResponse.json({
    ok: true,
    keyId: razorpayKeyId(),
    razorpayOrderId: topup.order.id,
    amount: topup.order.amount,
    currency: topup.order.currency,
  });
}
