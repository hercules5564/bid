import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { razorpayEnabled, razorpayKeyId, createRazorpayOrder } from "@/server/razorpay";

export const dynamic = "force-dynamic";

/** Create a Razorpay order for a PENDING Gavl order (buyer only). */
export async function POST(req: NextRequest) {
  const uid = await getSessionUserId();
  if (!uid) return NextResponse.json({ ok: false, code: "AUTH", message: "Sign in first." }, { status: 401 });
  if (!razorpayEnabled()) {
    return NextResponse.json({ ok: false, code: "GATEWAY_DISABLED", message: "Card payments aren't configured." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const orderId = typeof body?.orderId === "string" ? body.orderId : "";
  if (!orderId) return NextResponse.json({ ok: false, code: "INVALID", message: "Missing order." }, { status: 400 });

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, buyerId: true, status: true, amount: true },
  });
  if (!order) return NextResponse.json({ ok: false, code: "NOT_FOUND", message: "Order not found." }, { status: 404 });
  if (order.buyerId !== uid)
    return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Not your order." }, { status: 403 });
  if (order.status !== "PENDING")
    return NextResponse.json({ ok: false, code: "NOT_PENDING", message: "This order is no longer payable." }, { status: 400 });

  const rzp = await createRazorpayOrder({ orderId: order.id, amountPaise: order.amount });
  if (!rzp.ok) return NextResponse.json(rzp, { status: 502 });
  return NextResponse.json({
    ok: true,
    keyId: razorpayKeyId(),
    razorpayOrderId: rzp.order.id,
    amount: rzp.order.amount,
    currency: rzp.order.currency,
  });
}
