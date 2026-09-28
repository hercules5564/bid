import { notFound } from "next/navigation";
import { Gavel, Trophy, Coins, TrendingUp, Crown } from "lucide-react";
import { getPublicProfile } from "@/server/dashboard";
import { formatMoney } from "@/lib/money";
import { Avatar } from "@/components/ui/Avatar";
import { StatCard } from "@/components/ui/stat";
import { CardGrid } from "@/components/listing/CardRail";
import { SectionHeader, EmptyState } from "@/components/ui/section";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

const PERIOD_LABEL: Record<string, string> = { DAY: "Today", WEEK: "This Week", MONTH: "This Month", ALL_TIME: "All-Time" };

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return { title: `@${handle}` };
}

export default async function ProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const profile = await getPublicProfile(handle);
  if (!profile) notFound();
  const { user, wins, placements } = profile;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="panel mb-6 flex flex-col items-start gap-5 p-6 sm:flex-row sm:items-center">
        <Avatar src={user.avatar} name={user.name} size="lg" ring className="!h-20 !w-20 !text-2xl" />
        <div className="flex-1">
          <h1 className="font-display text-2xl font-extrabold text-white sm:text-3xl">{user.name}</h1>
          <p className="text-sm text-white/45">@{user.handle}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {placements
              .filter((p) => p.rank != null)
              .map((p) => (
                <span
                  key={p.period}
                  className={cn(
                    "chip gap-1.5",
                    p.rank === 1 ? "border-medal-gold/40 bg-medal-gold/10 text-medal-gold" : "text-white/60"
                  )}
                >
                  {p.rank === 1 && <Crown size={12} />}
                  {PERIOD_LABEL[p.period]} · #{p.rank}
                </span>
              ))}
            {placements.every((p) => p.rank == null) && (
              <span className="chip text-white/40">Unranked — win a lot to climb the boards</span>
            )}
          </div>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total bids" value={user.totalBids} icon={<Gavel size={15} />} />
        <StatCard label="Auctions won" value={user.auctionsWon} tone="gold" icon={<Trophy size={15} />} />
        <StatCard label="Won value" value={formatMoney(user.totalWonValue)} tone="gold" icon={<Coins size={15} />} />
        <StatCard label="Highest bid" value={formatMoney(user.highestSingleBid)} tone="arc" icon={<TrendingUp size={15} />} />
      </div>

      <SectionHeader title="Winning lots" kicker="Trophy case" icon={<Trophy size={13} className="text-gold" />} />
      {wins.length ? (
        <CardGrid items={wins} />
      ) : (
        <EmptyState title="No wins on record yet" body={`@${user.handle} hasn't taken a lot home — yet.`} />
      )}
    </div>
  );
}
