"use client";
import { useCallback, useState } from "react";
import Link from "next/link";
import { Trophy, ArrowRight } from "lucide-react";
import { useSocketEvent } from "@/hooks/use-socket";
import { SocketEvent } from "@/lib/events";
import { LeaderboardRow } from "./LeaderboardList";
import type { LeaderboardBoard } from "@/types";

export function LeaderboardWidget({ initial, moneyScore }: { initial: LeaderboardBoard; moneyScore: boolean }) {
  const [board, setBoard] = useState<LeaderboardBoard>(initial);

  const refresh = useCallback(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((d) => d.ok && setBoard(d.boards.WEEK))
      .catch(() => {});
  }, []);
  useSocketEvent(SocketEvent.LeaderboardUpdate, refresh);

  return (
    <div className="panel p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy size={16} className="text-gold" />
          <span className="font-display text-base font-bold text-[#1a1408]">This Week&apos;s Top Bidders</span>
        </div>
        <Link href="/leaderboards" className="group inline-flex items-center gap-1 text-xs text-[#1a1408]/45 hover:text-gold">
          Full boards <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
      {board.entries.length === 0 ? (
        <p className="py-6 text-center text-sm text-[#1a1408]/35">No ranked bidders yet — win a lot to appear here.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {board.entries.slice(0, 5).map((e) => (
            <LeaderboardRow key={e.user.id} entry={e} moneyScore={moneyScore} />
          ))}
        </div>
      )}
      {board.you && !board.entries.slice(0, 5).some((e) => e.user.id === board.you!.user.id) && (
        <div className="mt-2 border-t border-[#3c2d0f]/10 pt-2">
          <LeaderboardRow entry={board.you} moneyScore={moneyScore} highlight />
        </div>
      )}
    </div>
  );
}
