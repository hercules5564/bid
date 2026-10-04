import { NextRequest, NextResponse } from "next/server";
import { verifyBybitWebhook } from "@/server/payments";
import { finalizePaidOrder } from "@/server/orders";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Bybit Pay webhook safety net: if the buyer pays but closes the tab before
 * the status poll settles the order, the PAY_SUCCESS callback settles it.
 * Signature is RSA-verified before anything else. Point Bybit's webhookUrl
 * here (the create-payment call already sends this URL per order).
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const timestamp = req.headers.get("timestamp");
  const signature = req.headers.get("signature");
  if (!verifyBybitWebhook({ timestamp, rawBody: raw, signature })) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const event = JSON.parse(raw) as {
    paymentType?: string;
    merchantTradeNo?: string;
    payId?: string;
    status?: string;
  };
  // Refund callbacks are informational — the dispute flow records refunds
  // from the refund API response itself.
  if (event.paymentType !== "E_COMMERCE" || event.status !== "PAY_SUCCESS") {
    return NextResponse.json({ ok: true });
  }
  if (!event.merchantTradeNo || !event.payId) return NextResponse.json({ ok: true });

  const order = await prisma.order.findUnique({
    where: { id: event.merchantTradeNo },
    select: { id: true, buyerId: true, status: true },
  });
  if (!order || order.status !== "PENDING") return NextResponse.json({ ok: true });

  await finalizePaidOrder({
    orderId: order.id,
    buyerId: order.buyerId,
    provider: "bybit",
    providerRef: event.payId,
  });
  return NextResponse.json({ ok: true });
}
