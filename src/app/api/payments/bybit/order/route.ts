import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { bybitEnabled, createBybitPayment } from "@/server/payments";

export const dynamic = "force-dynamic";

function baseUrl(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3001";
  return `${proto}://${host}`;
}

/** Create a Bybit Pay QR payment for a PENDING Gavl order (buyer only). */
export async function POST(req: NextRequest) {
  const uid = await getSessionUserId();
  if (!uid) return NextResponse.json({ ok: false, code: "AUTH", message: "Sign in first." }, { status: 401 });
  if (!bybitEnabled()) {
    return NextResponse.json({ ok: false, code: "GATEWAY_DISABLED", message: "Bybit Pay isn't configured." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const orderId = typeof body?.orderId === "string" ? body.orderId : "";
  if (!orderId) return NextResponse.json({ ok: false, code: "INVALID", message: "Missing order." }, { status: 400 });

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      buyerId: true,
      status: true,
      amount: true,
      listing: { select: { title: true } },
      buyer: { select: { email: true, name: true } },
    },
  });
  if (!order) return NextResponse.json({ ok: false, code: "NOT_FOUND", message: "Order not found." }, { status: 404 });
  if (order.buyerId !== uid)
    return NextResponse.json({ ok: false, code: "FORBIDDEN", message: "Not your order." }, { status: 403 });
  if (order.status !== "PENDING")
    return NextResponse.json({ ok: false, code: "NOT_PENDING", message: "This order is no longer payable." }, { status: 400 });

  const base = baseUrl(req);
  const pay = await createBybitPayment({
    orderId: order.id,
    amountPaise: order.amount,
    title: order.listing.title,
    buyerEmail: order.buyer.email,
    buyerName: order.buyer.name,
    successUrl: `${base}/orders`,
    failedUrl: `${base}/checkout/${order.id}`,
    webhookUrl: `${base}/api/payments/bybit/webhook`,
  });
  if (!pay.ok) return NextResponse.json(pay, { status: 502 });
  return NextResponse.json({ orderId: order.id, ...pay });
}
