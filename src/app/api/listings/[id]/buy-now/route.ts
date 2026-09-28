import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { buyNow } from "@/server/bidding";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const uid = await getSessionUserId();
  if (!uid) return NextResponse.json({ ok: false, code: "AUTH", message: "Sign in to buy." }, { status: 401 });

  const { id } = await ctx.params;
  const result = await buyNow({ listingId: id, userId: uid });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
