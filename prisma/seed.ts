import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ---- helpers ----------------------------------------------------------------
const R = (rupees: number) => Math.round(rupees * 100); // rupees -> paise
const now = Date.now();
const mins = (n: number) => new Date(now + n * 60_000);
const hours = (n: number) => new Date(now + n * 3_600_000);
const days = (n: number) => new Date(now + n * 86_400_000);
const IMG = (seed: string) => `https://picsum.photos/seed/${seed}/900/675`;
const AVA = (h: string) => `https://i.pravatar.cc/150?u=${h}`;

async function main() {
  console.log("⛏  Seeding Gavl…");

  // Clear in dependency order.
  await prisma.notification.deleteMany();
  await prisma.watchlist.deleteMany();
  await prisma.order.deleteMany();
  await prisma.bid.deleteMany();
  await prisma.showdownEvent.deleteMany();
  await prisma.leaderboardSnapshot.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.deleteMany();

  // ---- Categories -----------------------------------------------------------
  const catData = [
    { name: "Electronics", slug: "electronics", icon: "cpu", accent: "arc" },
    { name: "Art & Collectibles", slug: "art", icon: "palette", accent: "gold" },
    { name: "Watches", slug: "watches", icon: "watch", accent: "gold" },
    { name: "Sneakers", slug: "sneakers", icon: "footprints", accent: "mint" },
    { name: "Gaming", slug: "gaming", icon: "gamepad-2", accent: "arc" },
    { name: "Automotive", slug: "automotive", icon: "car", accent: "ember" },
    { name: "Rare Items", slug: "rare", icon: "gem", accent: "gold" },
  ];
  await prisma.category.createMany({ data: catData });
  const cats = Object.fromEntries((await prisma.category.findMany()).map((c) => [c.slug, c.id]));

  // ---- Users ----------------------------------------------------------------
  const hash = await bcrypt.hash("password123", 10);
  const userData = [
    { handle: "housemaster", name: "The Auction House", email: "admin@gavl.live", role: "ADMIN" as const },
    { handle: "rhea_k", name: "Rhea Kapoor", email: "rhea@gavl.live", role: "BIDDER" as const },
    { handle: "arjun99", name: "Arjun Mehta", email: "arjun@gavl.live", role: "BIDDER" as const },
    { handle: "the_collector", name: "V. Rao", email: "collector@gavl.live", role: "BIDDER" as const },
    { handle: "mira_bids", name: "Mira Sen", email: "mira@gavl.live", role: "BIDDER" as const },
    { handle: "kabir_v", name: "Kabir Verma", email: "kabir@gavl.live", role: "BIDDER" as const },
    { handle: "ananya", name: "Ananya Iyer", email: "ananya@gavl.live", role: "BIDDER" as const },
    { handle: "devsnipes", name: "Dev Malhotra", email: "dev@gavl.live", role: "BIDDER" as const },
    { handle: "priya_r", name: "Priya Reddy", email: "priya@gavl.live", role: "BIDDER" as const },
    { handle: "zaid", name: "Zaid Khan", email: "zaid@gavl.live", role: "BIDDER" as const },
    { handle: "neha_m", name: "Neha Mathur", email: "neha@gavl.live", role: "BIDDER" as const },
  ];
  await prisma.user.createMany({
    data: userData.map((u) => ({ ...u, passwordHash: hash, avatar: AVA(u.handle) })),
  });
  const users = Object.fromEntries((await prisma.user.findMany()).map((u) => [u.handle, u.id]));
  const admin = users["housemaster"];
  const bidders = userData.filter((u) => u.role === "BIDDER").map((u) => users[u.handle]);

  // ---- Listing factory ------------------------------------------------------
  type BidSpec = { user: string; rupees: number; at: Date };
  async function makeListing(o: {
    title: string;
    description: string;
    imgSeeds: string[];
    category: string;
    startRupees: number;
    incRupees: number;
    buyNowRupees?: number;
    durationType: "HOURLY" | "DAILY" | "WEEKLY" | "WEEKLY_SHOWDOWN";
    startsAt: Date;
    endsAt: Date;
    status: "LIVE" | "ENDING_SOON" | "SOLD" | "UNSOLD";
    featured?: boolean;
    bids: BidSpec[];
    winner?: string;
  }) {
    const current = o.bids.length ? o.bids[o.bids.length - 1].rupees : o.startRupees;
    const listing = await prisma.listing.create({
      data: {
        title: o.title,
        description: o.description,
        images: o.imgSeeds.map(IMG),
        categoryId: cats[o.category],
        sellerId: admin,
        startingPrice: R(o.startRupees),
        currentPrice: R(current),
        bidIncrement: R(o.incRupees),
        buyNowPrice: o.buyNowRupees ? R(o.buyNowRupees) : null,
        durationType: o.durationType,
        startsAt: o.startsAt,
        endsAt: o.endsAt,
        status: o.status,
        isFeatured: o.featured ?? false,
        bidCount: o.bids.length,
        winnerId: o.winner ? users[o.winner] : null,
      },
    });
    for (let i = 0; i < o.bids.length; i++) {
      const b = o.bids[i];
      await prisma.bid.create({
        data: {
          listingId: listing.id,
          userId: users[b.user],
          amount: R(b.rupees),
          isWinning: i === o.bids.length - 1,
          createdAt: b.at,
        },
      });
    }
    // Sold lots open an Order so the winner can go through checkout.
    if (o.status === "SOLD" && o.winner) {
      await prisma.order.create({
        data: { listingId: listing.id, buyerId: users[o.winner], sellerId: admin, amount: R(current) },
      });
    }
    return listing;
  }

  // Build an escalating ladder of bids ending near `endRupees`.
  function ladder(handles: string[], startR: number, stepR: number, count: number, from: Date, to: Date): BidSpec[] {
    const span = to.getTime() - from.getTime();
    return Array.from({ length: count }, (_, i) => ({
      user: handles[i % handles.length],
      rupees: startR + stepR * (i + 1),
      at: new Date(from.getTime() + (span * (i + 1)) / (count + 1)),
    }));
  }

  // ---- The Weekly Showdown (priciest lot on the platform) -------------------
  const showdown = await makeListing({
    title: "1965 Rolex ‘Paul Newman’ Daytona — Ref. 6239",
    description:
      "The grail of vintage chronographs. Exotic dial, tropical patina, box and period papers. Independently authenticated.\n\nThis is the single most valuable lot on Gavl this week — the headline of the Weekly Showdown.",
    imgSeeds: ["daytona1", "daytona2", "daytona3"],
    category: "watches",
    startRupees: 8_500_000,
    incRupees: 50_000,
    durationType: "WEEKLY_SHOWDOWN",
    startsAt: days(-2),
    endsAt: days(3),
    status: "LIVE",
    featured: true,
    bids: ladder(["the_collector", "rhea_k", "kabir_v", "arjun99"], 8_500_000, 120_000, 9, days(-2), mins(-8)),
  });
  await prisma.showdownEvent.create({ data: { listingId: showdown.id, openedAt: days(-2), isActive: true } });

  // ---- Flash (HOURLY) lots --------------------------------------------------
  await makeListing({
    title: "Apple AirPods Max — Midnight, sealed",
    description: "Brand-new, factory sealed. Flash lot — gone in hours.",
    imgSeeds: ["airpods1", "airpods2"],
    category: "electronics",
    startRupees: 24_000,
    incRupees: 500,
    buyNowRupees: 52_000,
    durationType: "HOURLY",
    startsAt: hours(-1),
    endsAt: hours(2),
    status: "LIVE",
    bids: ladder(["mira_bids", "zaid", "neha_m"], 24_000, 900, 5, hours(-1), mins(-3)),
  });
  await makeListing({
    title: "Air Jordan 1 Retro High ‘Chicago Lost & Found’",
    description: "Deadstock, US 9. One of the most wanted retros of the decade.",
    imgSeeds: ["jordan1", "jordan2"],
    category: "sneakers",
    startRupees: 32_000,
    incRupees: 1_000,
    durationType: "HOURLY",
    startsAt: hours(-2),
    endsAt: hours(4),
    status: "LIVE",
    bids: ladder(["arjun99", "priya_r", "devsnipes"], 32_000, 1_500, 6, hours(-2), mins(-5)),
  });
  await makeListing({
    title: "PlayStation 5 Pro — Collector’s bundle",
    description: "PS5 Pro with two controllers and three titles. Flash sale.",
    imgSeeds: ["ps5a", "ps5b"],
    category: "gaming",
    startRupees: 55_000,
    incRupees: 1_000,
    buyNowRupees: 95_000,
    durationType: "HOURLY",
    startsAt: mins(-40),
    endsAt: hours(1),
    status: "LIVE",
    bids: ladder(["neha_m", "kabir_v"], 55_000, 2_000, 3, mins(-40), mins(-2)),
  });

  // ---- Daily lots -----------------------------------------------------------
  await makeListing({
    title: "Leica Q3 — 60MP full-frame compact",
    description: "The definitive walk-around camera. Under 500 shutter actuations.",
    imgSeeds: ["leica1", "leica2"],
    category: "electronics",
    startRupees: 4_20_000,
    incRupees: 5_000,
    durationType: "DAILY",
    startsAt: hours(-6),
    endsAt: hours(18),
    status: "LIVE",
    bids: ladder(["rhea_k", "the_collector", "ananya"], 4_20_000, 12_000, 5, hours(-6), mins(-20)),
  });
  await makeListing({
    title: "Custom Loop RTX 4090 Battlestation",
    description: "Hand-built, hard-tube water cooling, Ryzen 9. A trophy rig.",
    imgSeeds: ["pc1", "pc2"],
    category: "gaming",
    startRupees: 2_80_000,
    incRupees: 5_000,
    buyNowRupees: 5_50_000,
    durationType: "DAILY",
    startsAt: hours(-10),
    endsAt: hours(14),
    status: "LIVE",
    bids: ladder(["devsnipes", "zaid", "arjun99"], 2_80_000, 10_000, 4, hours(-10), mins(-30)),
  });

  // ---- Weekly lots ----------------------------------------------------------
  await makeListing({
    title: "Omega Speedmaster Professional ‘Moonwatch’",
    description: "Hesalite, manual-wind, full set. The watch worn on the Moon.",
    imgSeeds: ["speedy1", "speedy2"],
    category: "watches",
    startRupees: 3_60_000,
    incRupees: 4_000,
    durationType: "WEEKLY",
    startsAt: days(-1),
    endsAt: days(6),
    status: "LIVE",
    bids: ladder(["kabir_v", "mira_bids", "priya_r"], 3_60_000, 9_000, 4, days(-1), hours(-2)),
  });
  await makeListing({
    title: "Original Ink Study — signed, framed",
    description: "A one-of-one ink study from a celebrated contemporary illustrator.",
    imgSeeds: ["art1", "art2"],
    category: "art",
    startRupees: 90_000,
    incRupees: 2_500,
    durationType: "WEEKLY",
    startsAt: days(-2),
    endsAt: days(5),
    status: "LIVE",
    bids: ladder(["ananya", "rhea_k"], 90_000, 6_000, 3, days(-2), hours(-5)),
  });
  await makeListing({
    title: "Meteorite Slice — Seymchan, etched",
    description: "A polished slice of a pallasite meteorite with olivine crystals.",
    imgSeeds: ["meteor1", "meteor2"],
    category: "rare",
    startRupees: 1_40_000,
    incRupees: 3_000,
    durationType: "WEEKLY",
    startsAt: days(-1),
    endsAt: days(4),
    status: "LIVE",
    bids: [],
  });

  // ---- Closed / SOLD lots (populate leaderboards across periods) -----------
  const soldSpecs: Array<{
    title: string;
    category: string;
    imgSeed: string;
    startR: number;
    finalR: number;
    winner: string;
    runnersUp: string[];
    closedAt: Date;
    duration: "HOURLY" | "DAILY" | "WEEKLY";
  }> = [
    { title: "Hermès Birkin 30 — Togo", category: "rare", imgSeed: "birkin", startR: 6_00_000, finalR: 11_20_000, winner: "the_collector", runnersUp: ["rhea_k"], closedAt: hours(-3), duration: "DAILY" },
    { title: "Rolex Submariner ‘Kermit’", category: "watches", imgSeed: "sub", startR: 8_00_000, finalR: 13_50_000, winner: "rhea_k", runnersUp: ["kabir_v", "arjun99"], closedAt: hours(-9), duration: "WEEKLY" },
    { title: "MacBook Pro 16 M4 Max", category: "electronics", imgSeed: "mbp", startR: 2_10_000, finalR: 3_05_000, winner: "arjun99", runnersUp: ["devsnipes"], closedAt: hours(-20), duration: "DAILY" },
    { title: "Travis Scott x AJ1 Low", category: "sneakers", imgSeed: "ts", startR: 45_000, finalR: 92_000, winner: "priya_r", runnersUp: ["zaid"], closedAt: days(-2), duration: "HOURLY" },
    { title: "Fender ’62 Stratocaster", category: "art", imgSeed: "strat", startR: 1_80_000, finalR: 2_75_000, winner: "the_collector", runnersUp: ["ananya"], closedAt: days(-3), duration: "WEEKLY" },
    { title: "Ducati Panigale V4 — track", category: "automotive", imgSeed: "duc", startR: 12_00_000, finalR: 18_40_000, winner: "the_collector", runnersUp: ["kabir_v"], closedAt: days(-4), duration: "WEEKLY" },
    { title: "Signed Jersey — framed", category: "art", imgSeed: "jersey", startR: 60_000, finalR: 1_45_000, winner: "mira_bids", runnersUp: ["neha_m"], closedAt: days(-6), duration: "DAILY" },
    { title: "iPhone 16 Pro Max — 1TB", category: "electronics", imgSeed: "ip16", startR: 1_20_000, finalR: 1_66_000, winner: "kabir_v", runnersUp: ["priya_r"], closedAt: days(-11), duration: "DAILY" },
    { title: "Vintage Omega Seamaster", category: "watches", imgSeed: "seamaster", startR: 1_50_000, finalR: 2_30_000, winner: "rhea_k", runnersUp: ["mira_bids"], closedAt: days(-16), duration: "WEEKLY" },
    { title: "Gaming Chair — signed edition", category: "gaming", imgSeed: "chair", startR: 20_000, finalR: 41_000, winner: "devsnipes", runnersUp: ["zaid"], closedAt: days(-40), duration: "HOURLY" },
  ];

  for (const s of soldSpecs) {
    const handles = [...s.runnersUp, s.winner];
    const count = handles.length + 1;
    const step = Math.round((s.finalR - s.startR) / count);
    const bids: BidSpec[] = [];
    for (let i = 0; i < count; i++) {
      const user = i === count - 1 ? s.winner : handles[i % handles.length];
      const rupees = i === count - 1 ? s.finalR : s.startR + step * (i + 1);
      bids.push({ user, rupees, at: new Date(s.closedAt.getTime() - (count - i) * 3_600_000) });
    }
    await makeListing({
      title: s.title,
      description: "Sold on Gavl. Congratulations to the winning bidder.",
      imgSeeds: [s.imgSeed],
      category: s.category,
      startRupees: s.startR,
      incRupees: Math.max(500, Math.round(step / 2)),
      durationType: s.duration,
      startsAt: new Date(s.closedAt.getTime() - 86_400_000),
      endsAt: s.closedAt,
      status: "SOLD",
      winner: s.winner,
      bids,
    });
  }

  // ---- Watchlist + a few notifications for the demo bidder ------------------
  const demoUser = users["rhea_k"];
  const someLive = await prisma.listing.findFirst({ where: { status: "LIVE", durationType: "WEEKLY" } });
  if (someLive) await prisma.watchlist.create({ data: { userId: demoUser, listingId: someLive.id } });
  await prisma.notification.createMany({
    data: [
      { userId: demoUser, type: "WON", title: "You won! 🏆", body: "You won ‘Rolex Submariner Kermit’.", read: false },
      { userId: demoUser, type: "OUTBID", title: "You've been outbid", body: "Someone raised the Daytona in the Showdown.", listingId: showdown.id, read: false },
      { userId: demoUser, type: "SHOWDOWN_STARTING", title: "⚔️ Weekly Showdown is live", body: "The Paul Newman Daytona is this week's headline lot.", listingId: showdown.id, read: true },
    ],
  });

  // ---- Recompute aggregate user stats from the ground truth ----------------
  const allUsers = await prisma.user.findMany({ select: { id: true } });
  for (const u of allUsers) {
    const [agg, wins] = await Promise.all([
      prisma.bid.aggregate({ where: { userId: u.id }, _count: true, _max: { amount: true } }),
      prisma.listing.aggregate({ where: { winnerId: u.id, status: "SOLD" }, _count: true, _sum: { currentPrice: true } }),
    ]);
    await prisma.user.update({
      where: { id: u.id },
      data: {
        totalBids: agg._count,
        highestSingleBid: agg._max.amount ?? 0,
        auctionsWon: wins._count,
        totalWonValue: wins._sum.currentPrice ?? 0,
      },
    });
  }

  const counts = {
    categories: await prisma.category.count(),
    users: await prisma.user.count(),
    listings: await prisma.listing.count(),
    bids: await prisma.bid.count(),
  };
  console.log("✅ Seed complete:", counts);
  console.log("   Admin login →  admin@gavl.live  /  password123");
  console.log("   Bidder login → rhea@gavl.live   /  password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
