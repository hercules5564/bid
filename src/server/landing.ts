import { prisma } from "@/lib/prisma";
import { cached } from "@/lib/cache";

/**
 * Lightweight aggregates for the marketing homepage's live stats band.
 * Cheap grouped queries, cached so the landing stays snappy.
 */
export async function getLandingStats() {
  return cached("landing:stats", 10000, async () => {
    const [liveNow, bidsPlaced, sold, bidderCount] = await Promise.all([
      prisma.listing.count({ where: { status: { in: ["LIVE", "ENDING_SOON"] } } }),
      prisma.bid.count(),
      prisma.listing.aggregate({ _sum: { currentPrice: true }, where: { status: "SOLD" } }),
      prisma.user.count({ where: { totalBids: { gt: 0 } } }),
    ]);
    return {
      liveNow,
      bidsPlaced,
      transacted: sold._sum.currentPrice ?? 0, // paise
      bidders: bidderCount,
    };
  });
}