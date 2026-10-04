import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { settleBybitPayment } from "@/server/orders";

export const dynamic = "force-dynamic";

/**
 * Poll endpoint for the checkout QR screen: asks Bybit for the truth and
 * settles the order the moment it flips to PAY_SUCCESS. Contact details ride
 * along from the checkout form so the paid order is complete.
 */
export async function POST(req: NextRequest) {
  const uid = await getSessionUserId();
  if (!uid) return NextResponse.json({ ok: false, code: "AUTH", message: "Sign in first." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const str = (v: unknown) => (typeof v === "string" ? v : "");

  const result = await settleBybitPayment({
    orderId: str(body?.orderId),
    userId: uid,
    payId: str(body?.payId) || undefined,
    contactName: str(body?.contactName) || undefined,
    contactEmail: str(body?.contactEmail) || undefined,
    contactPhone: str(body?.contactPhone) || undefined,
    shipTo: str(body?.shipTo) || undefined,
  });

  // NOT_PAID_YET is the normal "keep polling" answer, not an error.
  if (!result.ok && result.code === "NOT_PAID_YET") {
    return NextResponse.json({ ok: false, pending: true, message: result.message });
  }
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
