import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { cancelOrder } from "@/server/orders";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const uid = await getSessionUserId();
  if (!uid) return NextResponse.json({ ok: false, code: "AUTH", message: "Sign in first." }, { status: 401 });

  const { id } = await ctx.params;
  const result = await cancelOrder(id, uid);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}