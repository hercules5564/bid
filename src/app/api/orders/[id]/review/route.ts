import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { submitReview } from "@/server/reviews";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const uid = await getSessionUserId();
  if (!uid) return NextResponse.json({ ok: false, code: "AUTH", message: "Sign in first." }, { status: 401 });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const result = await submitReview({
    orderId: id,
    userId: uid,
    rating: typeof body?.rating === "number" ? body.rating : NaN,
    comment: typeof body?.comment === "string" ? body.comment : undefined,
  });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
