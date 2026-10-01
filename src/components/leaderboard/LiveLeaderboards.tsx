"use client";
import { useCallback, useRef, useState } from "react";
import { Crown, Trophy, Flame } from "lucide-react";
import { useSocketEvent } from "@/hooks/use-socket";
import { SocketEvent } from "@/lib/events";
import { formatMoney } from "@/lib/money";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";
import { LeaderboardList } from "./LeaderboardList";
import type { LeaderboardBoard, LeaderboardEntry, LeaderboardPeriod } from "@/types";

const TABS: { period: LeaderboardPeriod; label: string }[] = [
  { period: "DAY", label: "Today" },
  { period: "WEEK", label: "This Week" },
  { period: "MONTH", label: "This Month" },
  { period: "ALL_TIME", label: "All-Time" },
];

type Boards = Record<LeaderboardPeriod, LeaderboardBoard>;

function HallOfFame({ champ, moneyScore }: { champ?: LeaderboardEntry; moneyScore: boolean }) {
  return (
    <div className="panel relative overflow-hidden p-6">
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold/10 blur-3xl" />
      <div className="label-caps mb-3 flex items-center gap-1.5 text-gold/70">
        <Crown size={13} /> Hall of Fame · All-time #1
      </div>
      {champ ? (
        <div className="flex items-center gap-4">
          <Avatar src={champ.user.avatar} name={champ.user.name} size="lg" ring />
          <div>
            <div className="font-display text-xl font-extrabold text-[#1a1408]">@{champ.user.handle}</div>
            <div className="mt-0.5 text-sm text-[#1a1408]/50">
              {champ.auctionsWon} wins · high bid {formatMoney(champ.highestSingleBid)}
            </div>
            <div className="num mt-1 text-lg font-bold text-gold">
              {moneyScore ? formatMoney(champ.score) : champ.score.toLocaleString("en-IN")}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-[#1a1408]/40">No champion crowned yet. The throne is open.</p>
      )}
    </div>
  );
}

export function LiveLeaderboards({
  initial,
  moneyScore,
  metricLabel,
}: {
  initial: Boards;
  moneyScore: boolean;
  metricLabel: string;
}) {
  const [boards, setBoards] = useState<Boards>(initial);
  const [active, setActive] = useState<LeaderboardPeriod>("WEEK");
  const [deltas, setDeltas] = useState<Record<LeaderboardPeriod, Map<string, number>>>({
    DAY: new Map(),
    WEEK: new Map(),
    MONTH: new Map(),
    ALL_TIME: new Map(),
  });
  const prev = useRef<Boards>(initial);

  const refresh = useCallback(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) return;
        const next = d.boards as Boards;
        const newDeltas = {} as Record<LeaderboardPeriod, Map<string, number>>;
        for (const { period } of TABS) {
          const m = new Map<string, number>();
          const before = new Map(prev.current[period].entries.map((e) => [e.user.id, e.rank]));
          for (const e of next[period].entries) {
            const was = before.get(e.user.id);
            if (was != null && was !== e.rank) m.set(e.user.id, was - e.rank);
          }
          newDeltas[period] = m;
        }
        prev.current = next;
        setBoards(next);
        setDeltas(newDeltas);
      })
      .catch(() => {});
  }, []);

  useSocketEvent(SocketEvent.LeaderboardUpdate, refresh);

  const board = boards[active];

  return (
    <div className="flex flex-col gap-5">
      <HallOfFame champ={boards.ALL_TIME.entries[0]} moneyScore={moneyScore} />

      <div className="panel p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Trophy size={16} className="text-gold" />
            <span className="font-display text-base font-bold text-[#1a1408]">Leaderboards</span>
          </div>
          <div className="flex gap-1 rounded-xl border border-[#3c2d0f]/10 bg-white/70 p-1">
            {TABS.map((t) => (
              <button
                key={t.period}
                onClick={() => setActive(t.period)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                  active === t.period ? "bg-gold text-ink-950" : "text-[#1a1408]/50 hover:text-[#1a1408]"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <p className="mb-3 flex items-center gap-1.5 text-xs text-[#1a1408]/40">
          <Flame size={12} className="text-ember" /> {metricLabel}
        </p>

        <LeaderboardList entries={board.entries} you={board.you} moneyScore={moneyScore} deltas={deltas[active]} />
      </div>
    </div>
  );
}
