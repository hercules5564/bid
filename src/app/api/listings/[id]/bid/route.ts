import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { placeBid } from "@/server/bidding";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const uid = await getSessionUserId();
  if (!uid) return NextResponse.json({ ok: false, code: "AUTH", message: "Sign in to bid." }, { status: 401 });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const amount = Number(body?.amount); // paise, server re-validates

  const result = await placeBid({ listingId: id, userId: uid, amount });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
