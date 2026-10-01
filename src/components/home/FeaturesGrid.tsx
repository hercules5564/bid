import { Zap, Swords, Trophy, ShieldCheck, BellRing, Timer } from "lucide-react";
import { cn } from "@/lib/cn";

const FEATURES = [
  {
    icon: Zap,
    title: "Real-time bidding",
    body: "Every bid is pushed over WebSockets and validated by the server before the floor sees it — no refresh, no lag, no double-spend.",
    tone: "text-arc-soft bg-arc/10 border-arc/20",
  },
  {
    icon: Swords,
    title: "Weekly Showdown",
    body: "Each week the priciest headliner on the platform opens the floor. Trade your week around one shot at the crown.",
    tone: "text-gold bg-gold/10 border-gold/20",
  },
  {
    icon: ShieldCheck,
    title: "Anti-snipe protection",
    body: "Bids in the closing seconds extend the clock, so last-millisecond snipes can never win on connection speed alone.",
    tone: "text-mint bg-mint/10 border-mint/20",
  },
  {
    icon: Timer,
    title: "Flash lots",
    body: "Hourly drops that run hot and close fast. High urgency, real time pressure, decided in seconds.",
    tone: "text-ember bg-ember/10 border-ember/20",
  },
  {
    icon: BellRing,
    title: "Watchlists & alerts",
    body: "Follow lots you care about and get pinged the moment you're outbid, something ends soon, or you win.",
    tone: "text-gold bg-gold/10 border-gold/20",
  },
  {
    icon: Trophy,
    title: "Game-like leaderboards",
    body: "Ranked by value won, bids placed, or volume — weekly glory with your name at the top of the house.",
    tone: "text-arc-soft bg-arc/10 border-arc/20",
  },
];

export function FeaturesGrid() {
  return (
    <section className="mx-auto max-w-6xl px-1 py-20 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <div className="label-caps mb-3">One platform for the whole floor</div>
        <h2 className="font-display text-3xl font-extrabold tracking-tight text-[#1a1408] sm:text-4xl">
          Everything you need to bid, win and stay on top.
        </h2>
        <p className="mt-4 text-[#1a1408]/50">
          Think of it as a live trading floor for collectibles — engineered for pace, fairness and a little drama.
        </p>
      </div>

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="group rounded-2xl border border-[#3c2d0f]/15 bg-white/70 p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/[0.12] hover:bg-ink-850"
          >
            <div className={cn("mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl border", f.tone)}>
              <f.icon size={20} />
            </div>
            <h3 className="font-display text-lg font-bold text-[#1a1408]">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#1a1408]/50">{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}