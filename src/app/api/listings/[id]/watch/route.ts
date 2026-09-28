import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const uid = await getSessionUserId();
  if (!uid) return NextResponse.json({ ok: false, error: "Sign in to watch auctions." }, { status: 401 });

  const { id } = await ctx.params;
  const existing = await prisma.watchlist.findUnique({
    where: { userId_listingId: { userId: uid, listingId: id } },
  });

  if (existing) {
    await prisma.watchlist.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true, watching: false });
  }
  await prisma.watchlist.create({ data: { userId: uid, listingId: id } });
  return NextResponse.json({ ok: true, watching: true });
}
