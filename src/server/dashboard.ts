import { prisma } from "@/lib/prisma";
import { listingSummary } from "./serialize";
import { computeAllBoards } from "./leaderboard";
import type { ListingSummary, LeaderboardPeriod } from "@/types";
import type { Prisma } from "@prisma/client";

const CARD_SELECT = {
  id: true,
  title: true,
  images: true,
  currentPrice: true,
  bidIncrement: true,
  bidCount: true,
  durationType: true,
  status: true,
  endsAt: true,
  isFeatured: true,
  category: { select: { name: true, slug: true, icon: true, accent: true } },
} satisfies Prisma.ListingSelect;

const OPEN = ["SCHEDULED", "LIVE", "ENDING_SOON"] as const;

export async function getUserDashboard(userId: string) {
  const bidListingIds = (
    await prisma.bid.findMany({ where: { userId }, distinct: ["listingId"], select: { listingId: true } })
  ).map((b) => b.listingId);

  const [activeRows, winningRows, watchRows, wonRows, pendingOrders] = await Promise.all([
    prisma.listing.findMany({
      relationLoadStrategy: "join",
      where: { id: { in: bidListingIds }, status: { in: [...OPEN] } },
      orderBy: { endsAt: "asc" },
      select: CARD_SELECT,
    }),
    prisma.bid.findMany({
      where: { listingId: { in: bidListingIds }, isWinning: true },
      select: { listingId: true, userId: true },
    }),
    prisma.watchlist.findMany({
      relationLoadStrategy: "join",
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { listing: { select: CARD_SELECT } },
    }),
    prisma.listing.findMany({
      relationLoadStrategy: "join",
      where: { winnerId: userId, status: "SOLD" },
      orderBy: { endsAt: "desc" },
      take: 12,
      select: CARD_SELECT,
    }),
    prisma.order.findMany({
      where: { buyerId: userId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { listing: { select: { id: true, title: true, images: true } } },
    }),
  ]);

  const leadingSet = new Set(winningRows.filter((w) => w.userId === userId).map((w) => w.listingId));

  const activeBids: (ListingSummary & { leading: boolean })[] = activeRows.map((l) => ({
    ...listingSummary(l),
    leading: leadingSet.has(l.id),
  }));

  return {
    activeBids,
    watchlist: watchRows.map((w) => listingSummary(w.listing)),
    won: wonRows.map(listingSummary),
    pendingOrders: pendingOrders.map((o) => ({
      id: o.id,
      amount: o.amount,
      createdAt: o.createdAt.toISOString(),
      listing: {
        id: o.listing.id,
        title: o.listing.title,
        image: o.listing.images[0] ?? null,
      },
    })),
  };
}

export async function getPublicProfile(handle: string) {
  const user = await prisma.user.findFirst({
    where: { handle: { equals: handle, mode: "insensitive" } },
    select: {
      id: true,
      handle: true,
      name: true,
      avatar: true,
      createdAt: true,
      totalBids: true,
      auctionsWon: true,
      totalWonValue: true,
      highestSingleBid: true,
    },
  });
  if (!user) return null;

  const [wonRows, boards] = await Promise.all([
    prisma.listing.findMany({
      relationLoadStrategy: "join",
      where: { winnerId: user.id, status: "SOLD" },
      orderBy: { endsAt: "desc" },
      take: 8,
      select: CARD_SELECT,
    }),
    computeAllBoards(user.id),
  ]);

  const placements = (Object.keys(boards) as LeaderboardPeriod[]).map((period) => ({
    period,
    rank: boards[period].you?.rank ?? null,
  }));

  return { user, wins: wonRows.map(listingSummary), placements };
}
