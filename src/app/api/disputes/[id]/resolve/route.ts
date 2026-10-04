import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { resolveDispute } from "@/server/disputes";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const uid = await getSessionUserId();
  if (!uid) return NextResponse.json({ ok: false, code: "AUTH", message: "Sign in first." }, { status: 401 });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const result = await resolveDispute({
    disputeId: id,
    adminId: uid,
    outcome: body?.outcome === "refund" ? "refund" : "reject",
    resolution: typeof body?.resolution === "string" ? body.resolution : "",
    refundTxRef: typeof body?.refundTxRef === "string" ? body.refundTxRef : undefined,
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
