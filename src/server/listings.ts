import { prisma } from "@/lib/prisma";
import { cached } from "@/lib/cache";
import { listingDetail, listingSummary } from "./serialize";
import { countActiveBidders } from "./bidding";
import type { ListingSummary } from "@/types";
import type { Prisma } from "@prisma/client";

const CATEGORY_SELECT = { name: true, slug: true, icon: true, accent: true } as const;
const BADGE_SELECT = { id: true, handle: true, name: true, avatar: true } as const;

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
  category: { select: CATEGORY_SELECT },
} satisfies Prisma.ListingSelect;

const OPEN_STATUSES = ["SCHEDULED", "LIVE", "ENDING_SOON"] as const;

async function cards(
  where: Prisma.ListingWhereInput,
  orderBy: Prisma.ListingOrderByWithRelationInput | Prisma.ListingOrderByWithRelationInput[],
  take = 8
): Promise<ListingSummary[]> {
  const rows = await prisma.listing.findMany({
    relationLoadStrategy: "join",
    where,
    orderBy,
    take,
    select: CARD_SELECT,
  });
  return rows.map(listingSummary);
}

// Rails change slowly and are shown on the busy homepage — cache briefly so
// repeat visits and navigation don't re-run them against a distant DB.
const RAIL_TTL = 8000;

export function getFlashRail() {
  return cached("rail:flash", RAIL_TTL, () =>
    cards({ durationType: "HOURLY", status: { in: [...OPEN_STATUSES] } }, [{ endsAt: "asc" }], 10)
  );
}

export function getEndingSoonRail() {
  return cached("rail:ending", RAIL_TTL, () =>
    cards({ status: { in: ["LIVE", "ENDING_SOON"] }, durationType: { not: "WEEKLY_SHOWDOWN" } }, [{ endsAt: "asc" }], 10)
  );
}

export function getTrendingRail() {
  return cached("rail:trending", RAIL_TTL, () =>
    cards(
      { status: { in: ["LIVE", "ENDING_SOON"] }, durationType: { not: "WEEKLY_SHOWDOWN" } },
      [{ bidCount: "desc" }, { currentPrice: "desc" }],
      10
    )
  );
}

export function getFreshRail() {
  return cached("rail:fresh", RAIL_TTL, () =>
    cards({ status: { in: [...OPEN_STATUSES] } }, [{ createdAt: "desc" }], 10)
  );
}

export type CategoryWithCount = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  accent: string;
  liveCount: number;
};

export async function getCategoriesWithCounts() {
  return cached("categories", 20000, async () => {
    const [cats, counts] = await Promise.all([
      prisma.category.findMany({ orderBy: { name: "asc" } }),
      prisma.listing.groupBy({
        by: ["categoryId"],
        where: { status: { in: [...OPEN_STATUSES] } },
        _count: { _all: true },
      }),
    ]);
    const byId = new Map(counts.map((c) => [c.categoryId, c._count._all]));
    return cats.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      icon: c.icon,
      accent: c.accent,
      liveCount: byId.get(c.id) ?? 0,
    }));
  });
}

export type BrowseParams = {
  category?: string;
  durationType?: string;
  minPrice?: number; // paise
  maxPrice?: number; // paise
  q?: string;
  sort?: "ending" | "newest" | "priceHigh" | "priceLow" | "mostBids";
  includeClosed?: boolean;
};

export async function browseListings(params: BrowseParams): Promise<ListingSummary[]> {
  const where: Prisma.ListingWhereInput = {
    status: params.includeClosed
      ? { in: [...OPEN_STATUSES, "SOLD", "UNSOLD", "CLOSED"] }
      : { in: [...OPEN_STATUSES] },
  };
  if (params.category) where.category = { slug: params.category };
  if (params.durationType) where.durationType = params.durationType as never;
  if (params.q) where.title = { contains: params.q, mode: "insensitive" };
  if (params.minPrice != null || params.maxPrice != null) {
    where.currentPrice = {};
    if (params.minPrice != null) (where.currentPrice as Prisma.IntFilter).gte = params.minPrice;
    if (params.maxPrice != null) (where.currentPrice as Prisma.IntFilter).lte = params.maxPrice;
  }

  const orderBy: Record<string, Prisma.ListingOrderByWithRelationInput | Prisma.ListingOrderByWithRelationInput[]> = {
    ending: [{ endsAt: "asc" }],
    newest: [{ createdAt: "desc" }],
    priceHigh: [{ currentPrice: "desc" }],
    priceLow: [{ currentPrice: "asc" }],
    mostBids: [{ bidCount: "desc" }],
  };

  return cards(where, orderBy[params.sort ?? "ending"], 60);
}

export async function getListingDetail(id: string, userId?: string | null) {
  // All three key off the listing id (from the URL) and are independent, so run
  // them concurrently — one round-trip of wall-time, not three.
  const [l, watching, activeBidders] = await Promise.all([
    prisma.listing.findUnique({
      relationLoadStrategy: "join",
      where: { id },
      include: {
        category: { select: CATEGORY_SELECT },
        seller: { select: BADGE_SELECT },
        winner: { select: BADGE_SELECT },
        bids: {
          orderBy: { createdAt: "desc" },
          take: 40,
          include: { user: { select: BADGE_SELECT } },
        },
      },
    }),
    userId
      ? prisma.watchlist
          .findUnique({ where: { userId_listingId: { userId, listingId: id } } })
          .then(Boolean)
      : Promise.resolve(false),
    countActiveBidders(id),
  ]);
  if (!l) return null;

  return listingDetail(l, { watching, activeBidders });
}

export async function incrementView(id: string) {
  await prisma.listing.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => {});
}
