import { prisma } from "@/lib/prisma";
import { auctionConfig } from "@/lib/config";
import { cached, invalidate } from "@/lib/cache";
import { closeListing } from "./lifecycle";
import { notifyMany } from "./notifications";
import { countActiveBidders } from "./bidding";
import type { ShowdownHeroData } from "@/components/showdown/ShowdownHero";

/**
 * The Weekly Showdown spotlights the single most expensive item on the
 * platform — defined here as the eligible listing with the highest current
 * price (which equals starting price for anything without bids yet).
 */
export async function pickShowdownCandidate(now = new Date()) {
  return prisma.listing.findFirst({
    where: {
      durationType: { not: "WEEKLY_SHOWDOWN" },
      status: { in: ["SCHEDULED", "LIVE", "ENDING_SOON"] },
      endsAt: { gt: now },
    },
    orderBy: [{ currentPrice: "desc" }, { startingPrice: "desc" }],
    select: { id: true, title: true, currentPrice: true },
  });
}

export async function getActiveShowdown() {
  const event = await prisma.showdownEvent.findFirst({
    where: { isActive: true },
    orderBy: { openedAt: "desc" },
  });
  if (!event) return null;
  return prisma.listing.findUnique({ where: { id: event.listingId } });
}

/** Just the active Showdown's listing id — avoids re-fetching the whole listing
 *  when the caller (the Showdown page) is going to load full detail anyway. */
export async function getActiveShowdownId(): Promise<string | null> {
  const event = await prisma.showdownEvent.findFirst({
    where: { isActive: true },
    orderBy: { openedAt: "desc" },
    select: { listingId: true },
  });
  return event?.listingId ?? null;
}

/** Recent Showdown winners for the Hall-of-Fame strip on the event page. */
export async function getShowdownChampions(limit = 6) {
  const events = await prisma.showdownEvent.findMany({
    where: { isActive: false, winnerId: { not: null } },
    orderBy: { closedAt: "desc" },
    take: limit,
  });
  if (events.length === 0) return [];

  const listingIds = events.map((e) => e.listingId);
  const winnerIds = events.map((e) => e.winnerId!).filter(Boolean);
  const [listings, winners] = await Promise.all([
    prisma.listing.findMany({ where: { id: { in: listingIds } }, select: { id: true, title: true, images: true, currentPrice: true } }),
    prisma.user.findMany({ where: { id: { in: winnerIds } }, select: { id: true, handle: true, name: true, avatar: true } }),
  ]);
  const lMap = new Map(listings.map((l) => [l.id, l]));
  const wMap = new Map(winners.map((w) => [w.id, w]));

  return events.map((e) => {
    const l = lMap.get(e.listingId);
    const w = e.winnerId ? wMap.get(e.winnerId) : null;
    return {
      listingId: e.listingId,
      title: l?.title ?? "Lot",
      image: l?.images[0] ?? null,
      finalPrice: l?.currentPrice ?? 0,
      winner: w ? { id: w.id, handle: w.handle, name: w.name, avatar: w.avatar } : null,
      closedAt: e.closedAt?.toISOString() ?? null,
    };
  });
}

/** Compact data for the homepage Showdown hero. */
export async function getShowdownHero(): Promise<ShowdownHeroData | null> {
  return cached("showdownHero", 5000, async () => {
    const event = await prisma.showdownEvent.findFirst({
      where: { isActive: true },
      orderBy: { openedAt: "desc" },
    });
    if (!event) return null;
    const l = await prisma.listing.findUnique({
      where: { id: event.listingId },
      include: { category: { select: { name: true } } },
    });
    if (!l) return null;
    return {
      id: l.id,
      title: l.title,
      image: l.images[0] ?? null,
      currentPrice: l.currentPrice,
      bidCount: l.bidCount,
      endsAt: l.endsAt.toISOString(),
      activeBidders: await countActiveBidders(l.id),
      categoryName: l.category.name,
    };
  });
}

/**
 * Rotate the Showdown: force-close the current one, promote the priciest
 * eligible item, and alert every bidder. Called weekly by the scheduler
 * (and available as an admin/manual trigger).
 */
export async function rotateShowdown(now = new Date()) {
  // 1. Close the outgoing showdown, if any.
  const active = await prisma.showdownEvent.findMany({ where: { isActive: true } });
  for (const ev of active) {
    await prisma.listing.update({ where: { id: ev.listingId }, data: { endsAt: now } });
    await closeListing(ev.listingId, now);
  }

  // 2. Promote the priciest eligible listing.
  const candidate = await pickShowdownCandidate(now);
  if (!candidate) return { rotated: false as const, reason: "no eligible listing" };

  const endsAt = new Date(now.getTime() + auctionConfig.showdownDurationHours * 60 * 60 * 1000);
  await prisma.listing.update({
    where: { id: candidate.id },
    data: {
      durationType: "WEEKLY_SHOWDOWN",
      isFeatured: true,
      status: "LIVE",
      startsAt: now,
      endsAt,
    },
  });
  await prisma.showdownEvent.create({ data: { listingId: candidate.id, openedAt: now, isActive: true } });
  invalidate("showdownHero", "rail", "boards", "categories");

  // 3. Alert everyone.
  const users = await prisma.user.findMany({ select: { id: true } });
  await notifyMany(
    users.map((u) => u.id),
    () => ({
      type: "SHOWDOWN_STARTING",
      title: "⚔️ Weekly Showdown is live",
      body: `"${candidate.title}" is this week's headline lot. The floor is open.`,
      listingId: candidate.id,
    })
  );

  return { rotated: true as const, listingId: candidate.id, title: candidate.title, endsAt };
}
