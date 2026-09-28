import { getSessionUserId } from "@/lib/auth";
import { auctionConfig } from "@/lib/config";
import { getFlashRail, getCategoriesWithCounts } from "@/server/listings";
import { getLandingStats } from "@/server/landing";
import { computeAllBoards } from "@/server/leaderboard";
import { HeroSection } from "@/components/home/HeroSection";
import { StatsBand } from "@/components/home/StatsBand";
import { FeaturesGrid } from "@/components/home/FeaturesGrid";
import { CategoryStrip } from "@/components/home/CategoryStrip";
import { ShowcaseSection } from "@/components/home/ShowcaseSection";
import { CtaSection } from "@/components/home/CtaSection";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const uid = await getSessionUserId();
  const [stats, flash, categories, boards] = await Promise.all([
    getLandingStats(),
    getFlashRail(),
    getCategoriesWithCounts(),
    computeAllBoards(uid),
  ]);
  const moneyScore = auctionConfig.scoringMetric !== "BID_COUNT";

  return (
    <div className="flex flex-col">
      <HeroSection items={flash} />
      <StatsBand
        liveNow={stats.liveNow}
        bidsPlaced={stats.bidsPlaced}
        transacted={stats.transacted}
        bidders={stats.bidders}
      />
      <FeaturesGrid />
      <CategoryStrip categories={categories} />
      <ShowcaseSection board={boards.WEEK} moneyScore={moneyScore} />
      <CtaSection />
    </div>
  );
}