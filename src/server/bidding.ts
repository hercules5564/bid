import { prisma, TX_OPTS } from "@/lib/prisma";
import { auctionConfig } from "@/lib/config";
import {
  emitBidNew,
  emitTimer,
  emitClosed,
  emitShowdown,
  emitLeaderboard,
} from "@/lib/socket-emit";
import { invalidate } from "@/lib/cache";
import { notify } from "./notifications";

export type BidErrorCode =
  | "NOT_FOUND"
  | "NOT_LIVE"
  | "CLOSED"
  | "OWN_LISTING"
  | "ALREADY_LEADING"
  | "TOO_LOW"
  | "INVALID"
  | "NO_BUYNOW";

export type PlaceBidResult =
  | {
      ok: true;
      listingId: string;
      bidId: string;
      amount: number;
      currentPrice: number;
      minNextBid: number;
      bidCount: number;
      endsAt: string;
      status: string;
      extended: boolean;
      closed: boolean;
    }
  | { ok: false; code: BidErrorCode; message: string; minNextBid?: number };

// Row shape returned by the locked SELECT.
type LockedListing = {
  id: string;
  sellerId: string;
  currentPrice: number;
  bidIncrement: number;
  buyNowPrice: number | null;
  startsAt: Date;
  endsAt: Date;
  status: string;
  durationType: string;
  bidCount: number;
};

async function lockListing(tx: typeof prisma, listingId: string): Promise<LockedListing | null> {
  const rows = await tx.$queryRaw<LockedListing[]>`
    SELECT id, "sellerId", "currentPrice", "bidIncrement", "buyNowPrice",
           "startsAt", "endsAt", status::text AS status, "durationType"::text AS "durationType", "bidCount"
    FROM "Listing"
    WHERE id = ${listingId}
    FOR UPDATE
  `;
  return rows[0] ?? null;
}

function isLive(l: LockedListing, now: Date): boolean {
  const terminal = l.status === "CLOSED" || l.status === "SOLD" || l.status === "UNSOLD";
  return !terminal && l.startsAt <= now && now < l.endsAt;
}

export async function countActiveBidders(listingId: string): Promise<number> {
  const rows = await prisma.bid.findMany({
    where: { listingId },
    distinct: ["userId"],
    select: { userId: true },
  });
  return rows.length;
}

/**
 * Place a bid. The listing row is locked FOR UPDATE for the whole check-and-write,
 * so two concurrent bids are serialised — only one can become the winning bid.
 * Price, timer and validity are all decided here; the client is never trusted.
 */
export async function placeBid(input: {
  listingId: string;
  userId: string;
  amount: number;
}): Promise<PlaceBidResult> {
  const amount = Math.floor(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, code: "INVALID", message: "Enter a valid bid amount." };
  }

  const now = new Date();
  const window = auctionConfig.antiSnipeWindowSeconds * 1000;
  const endingSoon = auctionConfig.endingSoonSeconds * 1000;

  const result = await prisma.$transaction(async (tx) => {
    const listing = await lockListing(tx as typeof prisma, input.listingId);
    if (!listing) return { ok: false as const, code: "NOT_FOUND" as const, message: "Auction not found." };

    if (listing.sellerId === input.userId)
      return { ok: false as const, code: "OWN_LISTING" as const, message: "You can't bid on your own listing." };

    if (listing.startsAt > now)
      return { ok: false as const, code: "NOT_LIVE" as const, message: "This auction hasn't started yet." };

    if (!isLive(listing, now))
      return { ok: false as const, code: "CLOSED" as const, message: "This auction has closed." };

    const minNextBid = listing.currentPrice + listing.bidIncrement;
    if (amount < minNextBid)
      return {
        ok: false as const,
        code: "TOO_LOW" as const,
        message: `Bid must be at least ₹${Math.round(minNextBid / 100).toLocaleString("en-IN")}.`,
        minNextBid,
      };

    // Who currently leads? Prevent bidding against yourself.
    const currentWinner = await tx.bid.findFirst({
      where: { listingId: listing.id, isWinning: true },
      select: { userId: true },
    });
    if (currentWinner?.userId === input.userId)
      return { ok: false as const, code: "ALREADY_LEADING" as const, message: "You're already the top bidder." };

    // Demote the previous winning bid, crown the new one.
    await tx.bid.updateMany({
      where: { listingId: listing.id, isWinning: true },
      data: { isWinning: false },
    });
    const bid = await tx.bid.create({
      data: { listingId: listing.id, userId: input.userId, amount, isWinning: true },
      select: { id: true },
    });

    // Anti-snipe: a late bid pushes ends_at out so it can't be sniped.
    const timeLeft = listing.endsAt.getTime() - now.getTime();
    let endsAt = listing.endsAt;
    let extended = false;
    if (timeLeft <= window) {
      endsAt = new Date(now.getTime() + window);
      extended = true;
    }
    const timeLeftAfter = endsAt.getTime() - now.getTime();
    const status = timeLeftAfter <= endingSoon ? "ENDING_SOON" : "LIVE";
    const enteredEndingSoon = status === "ENDING_SOON" && listing.status !== "ENDING_SOON";

    await tx.listing.update({
      where: { id: listing.id },
      data: {
        currentPrice: amount,
        bidCount: { increment: 1 },
        endsAt,
        status: status as never,
      },
    });

    // Bidder aggregate stats.
    await tx.user.update({ where: { id: input.userId }, data: { totalBids: { increment: 1 } } });
    await tx.user.updateMany({
      where: { id: input.userId, highestSingleBid: { lt: amount } },
      data: { highestSingleBid: amount },
    });

    return {
      ok: true as const,
      bidId: bid.id,
      listingId: listing.id,
      amount,
      currentPrice: amount,
      minNextBid: amount + listing.bidIncrement,
      bidCount: listing.bidCount + 1,
      endsAt: endsAt.toISOString(),
      status,
      extended,
      enteredEndingSoon,
      durationType: listing.durationType,
      previousLeaderId: currentWinner?.userId ?? null,
    };
  }, TX_OPTS);

  if (!result.ok) return result;

  // ---- Post-commit side effects: broadcasts + notifications ----
  const bidder = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, handle: true, avatar: true },
  });

  emitBidNew({
    listingId: result.listingId,
    amount: result.amount,
    currentPrice: result.currentPrice,
    minNextBid: result.minNextBid,
    bidCount: result.bidCount,
    bidder: { id: bidder!.id, handle: bidder!.handle, avatar: bidder!.avatar },
    createdAt: new Date().toISOString(),
  });

  // Broadcast the timer whenever it was extended OR the lot just crossed into
  // ENDING_SOON on this bid (so watchers' UIs and badges update either way).
  if (result.extended || result.enteredEndingSoon) {
    emitTimer({ listingId: result.listingId, endsAt: result.endsAt, status: result.status, extended: result.extended });
  }

  if (result.durationType === "WEEKLY_SHOWDOWN") {
    emitShowdown({
      listingId: result.listingId,
      currentPrice: result.currentPrice,
      bidCount: result.bidCount,
      activeBidders: await countActiveBidders(result.listingId),
    });
  }

  if (auctionConfig.scoringMetric !== "WINNING_VALUE") emitLeaderboard();

  const needTitle =
    result.enteredEndingSoon || (result.previousLeaderId && result.previousLeaderId !== input.userId);
  const title = needTitle
    ? (await prisma.listing.findUnique({ where: { id: result.listingId }, select: { title: true } }))?.title ??
      "an auction"
    : "an auction";

  // Outbid notification to the dethroned leader.
  if (result.previousLeaderId && result.previousLeaderId !== input.userId) {
    await notify({
      userId: result.previousLeaderId,
      type: "OUTBID",
      title: "You've been outbid",
      body: `Someone raised the bid on "${title}". Jump back in.`,
      listingId: result.listingId,
    });
  }

  // If this bid pushed the lot into its final window, alert watchers once —
  // refreshStatuses only flips rows still marked LIVE, so it won't cover this.
  if (result.enteredEndingSoon) {
    const watchers = await prisma.watchlist.findMany({
      where: { listingId: result.listingId, NOT: { userId: input.userId } },
      select: { userId: true },
    });
    for (const w of watchers) {
      await notify({
        userId: w.userId,
        type: "ENDING_SOON",
        title: "Ending soon ⏳",
        body: `"${title}" is in its final minutes. Last chance to bid.`,
        listingId: result.listingId,
      });
    }
  }

  return {
    ok: true,
    listingId: result.listingId,
    bidId: result.bidId,
    amount: result.amount,
    currentPrice: result.currentPrice,
    minNextBid: result.minNextBid,
    bidCount: result.bidCount,
    endsAt: result.endsAt,
    status: result.status,
    extended: result.extended,
    closed: false,
  };
}

/**
 * Buy Now — instantly win and close the auction at buyNowPrice.
 */
export async function buyNow(input: { listingId: string; userId: string }): Promise<PlaceBidResult> {
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const listing = await lockListing(tx as typeof prisma, input.listingId);
    if (!listing) return { ok: false as const, code: "NOT_FOUND" as const, message: "Auction not found." };
    if (!listing.buyNowPrice)
      return { ok: false as const, code: "NO_BUYNOW" as const, message: "This auction has no Buy Now price." };
    if (listing.sellerId === input.userId)
      return { ok: false as const, code: "OWN_LISTING" as const, message: "You can't buy your own listing." };
    if (!isLive(listing, now))
      return { ok: false as const, code: "CLOSED" as const, message: "This auction has closed." };

    // Bidding may have climbed at/above the Buy Now price — don't let a buyout
    // undercut the standing high bid or hand the lot to a lower price.
    if (listing.currentPrice >= listing.buyNowPrice)
      return {
        ok: false as const,
        code: "NO_BUYNOW" as const,
        message: "Bidding has passed the Buy Now price — place a higher bid instead.",
      };

    const price = listing.buyNowPrice;

    const bidderRows = await tx.bid.findMany({
      where: { listingId: listing.id },
      distinct: ["userId"],
      select: { userId: true },
    });

    await tx.bid.updateMany({ where: { listingId: listing.id, isWinning: true }, data: { isWinning: false } });
    const bid = await tx.bid.create({
      data: { listingId: listing.id, userId: input.userId, amount: price, isWinning: true },
      select: { id: true },
    });

    await tx.listing.update({
      where: { id: listing.id },
      data: {
        currentPrice: price,
        bidCount: { increment: 1 },
        status: "SOLD" as never,
        winnerId: input.userId,
        endsAt: now,
      },
    });

    // Buy-now sales open an Order immediately (idempotent via unique listingId).
    await tx.order.upsert({
      where: { listingId: listing.id },
      update: {},
      create: {
        listingId: listing.id,
        buyerId: input.userId,
        sellerId: listing.sellerId,
        amount: price,
      },
    });

    // Bidder + winner stats in one shot.
    await tx.user.update({
      where: { id: input.userId },
      data: {
        totalBids: { increment: 1 },
        auctionsWon: { increment: 1 },
        totalWonValue: { increment: price },
      },
    });
    await tx.user.updateMany({
      where: { id: input.userId, highestSingleBid: { lt: price } },
      data: { highestSingleBid: price },
    });

    return {
      ok: true as const,
      bidId: bid.id,
      listingId: listing.id,
      price,
      bidCount: listing.bidCount + 1,
      bidderIds: bidderRows.map((b) => b.userId),
      durationType: listing.durationType,
    };
  }, TX_OPTS);

  if (!result.ok) return result;

  const [winner, listing] = await Promise.all([
    prisma.user.findUnique({ where: { id: input.userId }, select: { id: true, handle: true, avatar: true } }),
    prisma.listing.findUnique({ where: { id: result.listingId }, select: { title: true } }),
  ]);

  emitClosed({
    listingId: result.listingId,
    status: "SOLD",
    finalPrice: result.price,
    winner: { id: winner!.id, handle: winner!.handle, avatar: winner!.avatar },
  });
  invalidate("boards", "rail", "showdownHero", "categories");
  emitLeaderboard();

  await notify({
    userId: input.userId,
    type: "WON",
    title: "You won! 🏆",
    body: `You bought "${listing?.title ?? "an auction"}" outright.`,
    listingId: result.listingId,
  });
  for (const uid of result.bidderIds) {
    if (uid === input.userId) continue;
    await notify({
      userId: uid,
      type: "LOST",
      title: "Auction ended",
      body: `"${listing?.title ?? "An auction"}" was bought out before you could win it.`,
      listingId: result.listingId,
    });
  }

  return {
    ok: true,
    listingId: result.listingId,
    bidId: result.bidId,
    amount: result.price,
    currentPrice: result.price,
    minNextBid: result.price,
    bidCount: result.bidCount,
    endsAt: now.toISOString(),
    status: "SOLD",
    extended: false,
    closed: true,
  };
}
