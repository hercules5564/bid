import { prisma } from "@/lib/prisma";
import { auctionConfig } from "@/lib/config";
import { cached } from "@/lib/cache";
import type { LeaderboardBoard, LeaderboardEntry, LeaderboardPeriod } from "@/types";

const TOP_N = 10;

function periodStart(period: LeaderboardPeriod, now = new Date()): Date | null {
  const d = new Date(now);
  if (period === "DAY") {
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (period === "WEEK") {
    const day = (d.getDay() + 6) % 7; // Monday = 0
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (period === "MONTH") {
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }
  return null; // ALL_TIME
}

type Ranked = { userId: string; score: number; wins: number };

async function rankByWinningValue(start: Date | null): Promise<Ranked[]> {
  const grouped = await prisma.listing.groupBy({
    by: ["winnerId"],
    where: {
      status: "SOLD",
      winnerId: { not: null },
      ...(start ? { endsAt: { gte: start } } : {}),
    },
    _sum: { currentPrice: true },
    _count: { _all: true },
  });
  return grouped
    .filter((g) => g.winnerId)
    .map((g) => ({ userId: g.winnerId as string, score: g._sum.currentPrice ?? 0, wins: g._count._all }));
}

async function rankByBids(start: Date | null, metric: "BID_VOLUME" | "BID_COUNT"): Promise<Ranked[]> {
  const grouped = await prisma.bid.groupBy({
    by: ["userId"],
    where: start ? { createdAt: { gte: start } } : {},
    _sum: { amount: true },
    _count: { _all: true },
  });
  return grouped.map((g) => ({
    userId: g.userId,
    score: metric === "BID_VOLUME" ? g._sum.amount ?? 0 : g._count._all,
    wins: g._count._all,
  }));
}

export async function computeBoard(
  period: LeaderboardPeriod,
  currentUserId?: string | null
): Promise<LeaderboardBoard> {
  const start = periodStart(period);
  const metric = auctionConfig.scoringMetric;

  let ranked: Ranked[] =
    metric === "WINNING_VALUE" ? await rankByWinningValue(start) : await rankByBids(start, metric);

  ranked = ranked
    .filter((r) => r.score > 0)
    .sort((a, b) => (b.score - a.score) || (b.wins - a.wins) || a.userId.localeCompare(b.userId));

  const rankOf = new Map<string, number>();
  ranked.forEach((r, i) => rankOf.set(r.userId, i + 1));

  const topIds = ranked.slice(0, TOP_N).map((r) => r.userId);
  const needIds = new Set(topIds);
  if (currentUserId && rankOf.has(currentUserId)) needIds.add(currentUserId);

  const users = await prisma.user.findMany({
    where: { id: { in: [...needIds] } },
    select: { id: true, handle: true, name: true, avatar: true, highestSingleBid: true, auctionsWon: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));

  const toEntry = (r: Ranked): LeaderboardEntry | null => {
    const u = byId.get(r.userId);
    if (!u) return null;
    return {
      rank: rankOf.get(r.userId)!,
      user: { id: u.id, handle: u.handle, name: u.name, avatar: u.avatar },
      score: r.score,
      auctionsWon: metric === "WINNING_VALUE" ? r.wins : u.auctionsWon,
      highestSingleBid: u.highestSingleBid,
    };
  };

  const entries = ranked.slice(0, TOP_N).map(toEntry).filter(Boolean) as LeaderboardEntry[];

  let you: LeaderboardEntry | null = null;
  if (currentUserId) {
    const mine = ranked.find((r) => r.userId === currentUserId);
    if (mine) you = toEntry(mine);
  }

  return { period, entries, you };
}

export async function computeAllBoards(currentUserId?: string | null) {
  // Boards only change when an auction closes (which invalidates this key), so a
  // short TTL is safe and keeps the busy homepage/leaderboards page snappy.
  return cached(`boards:${currentUserId ?? "anon"}`, 5000, async () => {
    const periods: LeaderboardPeriod[] = ["DAY", "WEEK", "MONTH", "ALL_TIME"];
    const boards = await Promise.all(periods.map((p) => computeBoard(p, currentUserId)));
    return Object.fromEntries(periods.map((p, i) => [p, boards[i]])) as Record<LeaderboardPeriod, LeaderboardBoard>;
  });
}
