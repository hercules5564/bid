import Link from "next/link";
import { ChevronUp, ChevronDown, Crown } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { RankBadge } from "@/components/ui/primitives";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/cn";
import type { LeaderboardEntry } from "@/types";

function score(entry: LeaderboardEntry, money: boolean) {
  return money ? formatMoney(entry.score) : entry.score.toLocaleString("en-IN");
}

function Delta({ delta }: { delta?: number }) {
  if (!delta) return null;
  if (delta > 0)
    return (
      <span className="inline-flex items-center text-[0.65rem] font-bold text-mint">
        <ChevronUp size={12} />
        {delta}
      </span>
    );
  return (
    <span className="inline-flex items-center text-[0.65rem] font-bold text-ember/80">
      <ChevronDown size={12} />
      {Math.abs(delta)}
    </span>
  );
}

export function LeaderboardRow({
  entry,
  moneyScore,
  delta,
  highlight,
}: {
  entry: LeaderboardEntry;
  moneyScore: boolean;
  delta?: number;
  highlight?: boolean;
}) {
  return (
    <Link
      href={`/u/${entry.user.handle}`}
      className={cn(
        "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors",
        highlight
          ? "border-gold/30 bg-gold/[0.05]"
          : entry.rank === 1
            ? "border-medal-gold/25 bg-medal-gold/[0.04]"
            : "border-[#3c2d0f]/10 bg-[#3c2d0f]/[0.04] hover:bg-[#3c2d0f]/[0.05]"
      )}
    >
      <RankBadge rank={entry.rank} />
      <Avatar src={entry.user.avatar} name={entry.user.name} size="sm" ring={entry.rank === 1} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-[#1a1408]">@{entry.user.handle}</span>
          {entry.rank === 1 && <Crown size={13} className="text-medal-gold" />}
          <Delta delta={delta} />
        </div>
        <div className="text-[0.68rem] text-[#1a1408]/40">
          {entry.auctionsWon} wins · high {formatMoney(entry.highestSingleBid)}
        </div>
      </div>
      <div className="text-right">
        <div className="num text-sm font-bold text-gold">{score(entry, moneyScore)}</div>
      </div>
    </Link>
  );
}

export function LeaderboardList({
  entries,
  you,
  moneyScore,
  deltas,
  emptyLabel = "No ranked bidders yet.",
}: {
  entries: LeaderboardEntry[];
  you?: LeaderboardEntry | null;
  moneyScore: boolean;
  deltas?: Map<string, number>;
  emptyLabel?: string;
}) {
  const youInTop = you && entries.some((e) => e.user.id === you.user.id);
  return (
    <div className="flex flex-col gap-1.5">
      {entries.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#1a1408]/35">{emptyLabel}</p>
      ) : (
        entries.map((e) => (
          <LeaderboardRow key={e.user.id} entry={e} moneyScore={moneyScore} delta={deltas?.get(e.user.id)} />
        ))
      )}
      {you && !youInTop && (
        <>
          <div className="my-1 text-center text-xs text-[#1a1408]/25">···</div>
          <LeaderboardRow entry={you} moneyScore={moneyScore} highlight />
        </>
      )}
    </div>
  );
}
