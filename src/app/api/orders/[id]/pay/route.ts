import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { payOrder } from "@/server/orders";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const uid = await getSessionUserId();
  if (!uid) return NextResponse.json({ ok: false, code: "AUTH", message: "Sign in first." }, { status: 401 });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const result = await payOrder({
    orderId: id,
    userId: uid,
    contactName: typeof body?.contactName === "string" ? body.contactName : undefined,
    contactEmail: typeof body?.contactEmail === "string" ? body.contactEmail : undefined,
    contactPhone: typeof body?.contactPhone === "string" ? body.contactPhone : undefined,
    shipTo: typeof body?.shipTo === "string" ? body.shipTo : undefined,
    txRef: typeof body?.txRef === "string" ? body.txRef : undefined,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}