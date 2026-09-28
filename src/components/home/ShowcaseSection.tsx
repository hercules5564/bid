import Link from "next/link";
import { Trophy } from "lucide-react";
import { LeaderboardWidget } from "@/components/leaderboard/LeaderboardWidget";
import type { LeaderboardBoard } from "@/types";

const STEPS = [
  {
    n: "01",
    title: "Find your lot",
    body: "Flash lots, daily drops, week-long headliners and the rotating Weekly Showdown — all live, all on one floor.",
  },
  {
    n: "02",
    title: "Bid in real time",
    body: "Every bid is validated server-side and pushed live over WebSockets. Anti-snipe rules keep the ending fair for everyone.",
  },
  {
    n: "03",
    title: "Win, then rank",
    body: "Winning lots adds to your score and vaults you up the live leaderboards — weekly glory, month-long bragging rights.",
  },
];

export function ShowcaseSection({ board, moneyScore }: { board: LeaderboardBoard; moneyScore: boolean }) {
  return (
    <section className="border-y border-white/[0.06] bg-white/[0.015] py-16 sm:py-20">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <div>
          <div className="label-caps mb-3">How it plays</div>
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            From first bid to leaderboard glory in three moves.
          </h2>

          <div className="mt-10 flex flex-col gap-8">
            {STEPS.map((s) => (
              <div key={s.n} className="flex gap-5">
                <div className="num font-mono text-sm font-bold leading-7 text-gold/60">{s.n}</div>
                <div>
                  <h3 className="font-display text-lg font-bold text-white">{s.title}</h3>
                  <p className="mt-1.5 max-w-md text-sm leading-relaxed text-white/50">{s.body}</p>
                </div>
              </div>
            ))}
          </div>

          <Link href="/leaderboards" className="mt-10 inline-flex items-center gap-2 text-sm font-semibold text-gold hover:text-gold-soft">
            <Trophy size={15} /> Open the full leaderboards
          </Link>
        </div>

        <div className="self-start lg:sticky lg:top-24">
          <LeaderboardWidget initial={board} moneyScore={moneyScore} />
        </div>
      </div>
    </section>
  );
}