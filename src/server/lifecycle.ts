import { prisma, TX_OPTS } from "@/lib/prisma";
import { auctionConfig } from "@/lib/config";
import { emitClosed, emitTimer, emitLeaderboard } from "@/lib/socket-emit";
import { invalidate } from "@/lib/cache";
import { notify } from "./notifications";

type LockedRow = {
  id: string;
  title: string;
  status: string;
  endsAt: Date;
  currentPrice: number;
  durationType: string;
  sellerId: string;
};

/**
 * Move listings between time-driven states. Runs every scheduler tick.
 * Returns the ids that newly entered ENDING_SOON so callers can react.
 */
export async function refreshStatuses(now = new Date()) {
  const endingSoon = auctionConfig.endingSoonSeconds * 1000;

  // SCHEDULED -> LIVE
  await prisma.listing.updateMany({
    where: { status: "SCHEDULED", startsAt: { lte: now }, endsAt: { gt: now } },
    data: { status: "LIVE" },
  });

  // LIVE -> ENDING_SOON. Flip and select in ONE atomic UPDATE ... RETURNING so
  // the row lock guarantees each transition is claimed by exactly one caller,
  // even if two cron ticks overlap — no duplicate "ending soon" notifications.
  const soonCutoff = new Date(now.getTime() + endingSoon);
  const soon = await prisma.$queryRaw<Array<{ id: string; title: string; endsAt: Date }>>`
    UPDATE "Listing" SET status = 'ENDING_SOON'
    WHERE status = 'LIVE' AND "endsAt" > ${now} AND "endsAt" <= ${soonCutoff}
    RETURNING id, title, "endsAt"
  `;

  for (const s of soon) {
    emitTimer({ listingId: s.id, endsAt: s.endsAt.toISOString(), status: "ENDING_SOON" });
    const watchers = await prisma.watchlist.findMany({
      where: { listingId: s.id },
      select: { userId: true },
    });
    for (const w of watchers) {
      await notify({
        userId: w.userId,
        type: "ENDING_SOON",
        title: "Ending soon ⏳",
        body: `"${s.title}" is in its final minutes. Last chance to bid.`,
        listingId: s.id,
      });
    }
  }

  return soon.map((s) => s.id);
}

/**
 * Close every auction whose time is up. Each close re-locks the row and
 * re-checks the deadline so a last-second anti-snipe extension is respected.
 */
export async function closeDueAuctions(now = new Date()) {
  const candidates = await prisma.listing.findMany({
    where: {
      status: { in: ["SCHEDULED", "LIVE", "ENDING_SOON"] },
      endsAt: { lte: now },
    },
    select: { id: true },
  });

  let closed = 0;
  for (const c of candidates) {
    const outcome = await closeListing(c.id, now);
    if (outcome) closed++;
  }
  if (closed > 0) {
    invalidate("boards", "rail", "showdownHero", "categories");
    emitLeaderboard();
  }
  return closed;
}

/**
 * Close a single listing: crown the highest bidder, update stats, fire
 * WON/LOST notifications, resolve any Showdown. Returns null if it wasn't
 * actually due (e.g. extended by a bid between the scan and the lock).
 */
export async function closeListing(listingId: string, now = new Date()) {
  const outcome = await prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<LockedRow[]>`
      SELECT id, title, status::text AS status, "endsAt", "currentPrice", "durationType"::text AS "durationType", "sellerId"
      FROM "Listing" WHERE id = ${listingId} FOR UPDATE
    `;
    const l = rows[0];
    if (!l) return null;
    const terminal = l.status === "CLOSED" || l.status === "SOLD" || l.status === "UNSOLD";
    if (terminal || l.endsAt > now) return null; // not due anymore

    const winning = await tx.bid.findFirst({
      where: { listingId: l.id, isWinning: true },
      select: { userId: true, amount: true },
    });

    if (winning) {
      await tx.listing.update({
        where: { id: l.id },
        data: { status: "SOLD" as never, winnerId: winning.userId },
      });
      await tx.user.update({
        where: { id: winning.userId },
        data: {
          auctionsWon: { increment: 1 },
          totalWonValue: { increment: winning.amount },
        },
      });
      // Wire the sale: an Order is created the moment the hammer falls so the
      // winner can check out. idempotent via the unique listingId.
      await tx.order.upsert({
        where: { listingId: l.id },
        update: {},
        create: {
          listingId: l.id,
          buyerId: winning.userId,
          sellerId: l.sellerId,
          amount: winning.amount,
        },
      });
    } else {
      await tx.listing.update({ where: { id: l.id }, data: { status: "UNSOLD" as never } });
    }

    if (l.durationType === "WEEKLY_SHOWDOWN") {
      await tx.showdownEvent.updateMany({
        where: { listingId: l.id, isActive: true },
        data: { isActive: false, closedAt: now, winnerId: winning?.userId ?? null },
      });
    }

    // Gather everyone who bid, to fire WON/LOST after commit.
    const bidders = await tx.bid.findMany({
      where: { listingId: l.id },
      distinct: ["userId"],
      select: { userId: true },
    });

    return {
      id: l.id,
      title: l.title,
      finalPrice: l.currentPrice,
      winnerId: winning?.userId ?? null,
      bidderIds: bidders.map((b) => b.userId),
    };
  }, TX_OPTS);

  if (!outcome) return null;

  const winner = outcome.winnerId
    ? await prisma.user.findUnique({
        where: { id: outcome.winnerId },
        select: { id: true, handle: true, avatar: true },
      })
    : null;

  emitClosed({
    listingId: outcome.id,
    status: outcome.winnerId ? "SOLD" : "UNSOLD",
    finalPrice: outcome.finalPrice,
    winner: winner ? { id: winner.id, handle: winner.handle, avatar: winner.avatar } : null,
  });

  if (outcome.winnerId) {
    await notify({
      userId: outcome.winnerId,
      type: "WON",
      title: "You won! 🏆",
      body: `You won "${outcome.title}". Time to check out.`,
      listingId: outcome.id,
    });
    for (const uid of outcome.bidderIds) {
      if (uid === outcome.winnerId) continue;
      await notify({
        userId: uid,
        type: "LOST",
        title: "Auction ended",
        body: `You didn't win "${outcome.title}" this time.`,
        listingId: outcome.id,
      });
    }
  }

  return outcome;
}
