import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Snapshot used by the client to reconcile after a socket reconnect (any bid /
// timer / close events missed during the outage are healed from this).
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const l = await prisma.listing.findUnique({
    where: { id },
    select: {
      currentPrice: true,
      bidIncrement: true,
      bidCount: true,
      endsAt: true,
      status: true,
      winner: { select: { id: true, handle: true, name: true, avatar: true } },
    },
  });
  if (!l) return NextResponse.json({ ok: false }, { status: 404 });

  return NextResponse.json({
    ok: true,
    currentPrice: l.currentPrice,
    minNextBid: l.currentPrice + l.bidIncrement,
    bidCount: l.bidCount,
    endsAt: l.endsAt.toISOString(),
    status: l.status,
    winner: l.winner,
  });
}
