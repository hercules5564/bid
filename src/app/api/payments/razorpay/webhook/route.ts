import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRazorpayWebhook } from "@/server/razorpay";
import { finalizePaidOrder } from "@/server/orders";
import { settleCardTopup } from "@/server/wallet";

export const dynamic = "force-dynamic";

/**
 * Razorpay webhook (event: payment.captured). Safety net behind the client
 * verify-calls — both paths are idempotent, so double-settling is harmless.
 * Receipts: plain Gavl order ids for checkout, `topup:<uid>:<paise>:<ts>` for top-ups.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature");
  if (!verifyRazorpayWebhook(raw, signature)) {
    return NextResponse.json({ ok: false, code: "BAD_SIGNATURE" }, { status: 400 });
  }

  const body = JSON.parse(raw) as {
    event?: string;
    payload?: { payment?: { entity?: { id?: string; order_id?: string; amount?: number; currency?: string } } };
  };
  if (body.event !== "payment.captured") return NextResponse.json({ ok: true, ignored: body.event ?? null });

  const pay = body.payload?.payment?.entity;
  if (!pay?.id || !pay?.order_id || typeof pay.amount !== "number") {
    return NextResponse.json({ ok: false, code: "INVALID" }, { status: 400 });
  }

  // Our reference lives in the Razorpay order's receipt — look it up server-side.
  const receipt = await receiptFor(pay.order_id);
  if (!receipt) return NextResponse.json({ ok: false, code: "NOT_FOUND" }, { status: 404 });

  // Wallet top-up receipt: `topup:<uid>:<paise>:<ts>`.
  const topup = /^topup:([^:]+):(\d+):\d+$/.exec(receipt);
  if (topup) {
    const [, userId, paiseStr] = topup;
    if (Number(paiseStr) !== pay.amount) return NextResponse.json({ ok: false, code: "MISMATCH" }, { status: 400 });
    const res = await settleCardTopup({
      userId,
      amountPaise: pay.amount,
      providerRef: `rzp:${pay.id}`,
      note: "Card top-up via Razorpay (webhook)",
    });
    return NextResponse.json(res, { status: res.ok ? 200 : 400 });
  }

  // Otherwise the receipt IS the Gavl order id.
  const order = await prisma.order.findUnique({
    where: { id: receipt },
    select: { id: true, buyerId: true, status: true, amount: true },
  });
  if (!order) return NextResponse.json({ ok: false, code: "NOT_FOUND" }, { status: 404 });
  if (order.amount !== pay.amount) return NextResponse.json({ ok: false, code: "MISMATCH" }, { status: 400 });
  const res = await finalizePaidOrder({
    orderId: order.id,
    buyerId: order.buyerId,
    provider: "razorpay",
    providerRef: pay.id,
  });
  return NextResponse.json(res, { status: res.ok ? 200 : 400 });
}

/** Look up the Razorpay order's receipt (our reference) server-side. */
async function receiptFor(razorpayOrderId: string): Promise<string> {
  try {
    const id = process.env.RAZORPAY_KEY_ID ?? "";
    const secret = process.env.RAZORPAY_KEY_SECRET ?? "";
    if (!id || !secret) return "";
    const res = await fetch(`https://api.razorpay.com/v1/orders/${razorpayOrderId}`, {
      headers: { Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64") },
    });
    const data = (await res.json().catch(() => null)) as { receipt?: string } | null;
    return typeof data?.receipt === "string" ? data.receipt : "";
  } catch {
    return "";
  }
}
