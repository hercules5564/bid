import { Trophy } from "lucide-react";
import { getSessionUserId } from "@/lib/auth";
import { auctionConfig, SCORING_LABEL } from "@/lib/config";
import { computeAllBoards } from "@/server/leaderboard";
import { LiveLeaderboards } from "@/components/leaderboard/LiveLeaderboards";

export const dynamic = "force-dynamic";
export const metadata = { title: "Leaderboards" };

export default async function LeaderboardsPage() {
  const uid = await getSessionUserId();
  const boards = await computeAllBoards(uid);
  const moneyScore = auctionConfig.scoringMetric !== "BID_COUNT";
  const metricLabel = `Ranked by ${SCORING_LABEL[auctionConfig.scoringMetric].toLowerCase()}, tie-broken by wins`;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <div className="label-caps mb-1 flex items-center gap-1.5">
          <Trophy size={13} className="text-gold" /> The rankings
        </div>
        <h1 className="font-display text-3xl font-extrabold text-[#1a1408]">Leaderboards</h1>
        <p className="mt-1 text-sm text-[#1a1408]/50">
          Today, this week, this month, and the all-time Hall of Fame. Updates the moment an auction closes.
        </p>
      </div>
      <LiveLeaderboards initial={boards} moneyScore={moneyScore} metricLabel={metricLabel} />
    </div>
  );
}
