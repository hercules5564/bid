import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { topUpWithTxid } from "@/server/wallet";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const uid = await getSessionUserId();
  if (!uid) return NextResponse.json({ ok: false, code: "AUTH", message: "Sign in first." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const result = await topUpWithTxid({
    userId: uid,
    rupees: typeof body?.rupees === "number" ? body.rupees : NaN,
    txRef: typeof body?.txRef === "string" ? body.txRef : "",
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
