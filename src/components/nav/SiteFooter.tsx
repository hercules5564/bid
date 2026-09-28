import Link from "next/link";
import { Gavel } from "lucide-react";

const COLUMNS = [
  {
    title: "Explore",
    links: [
      { href: "/browse", label: "Browse lots" },
      { href: "/showdown", label: "Weekly Showdown" },
      { href: "/leaderboards", label: "Leaderboards" },
    ],
  },
  {
    title: "Auction types",
    links: [
      { href: "/browse?duration=HOURLY", label: "Flash lots" },
      { href: "/browse?duration=DAILY", label: "Daily drops" },
      { href: "/browse?duration=WEEKLY", label: "Weekly headliners" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/login", label: "Sign in" },
      { href: "/signup", label: "Create account" },
      { href: "/dashboard", label: "Dashboard" },
      { href: "/orders", label: "Orders" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-white/[0.06] bg-ink-950/50">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2">
              <Gavel size={18} className="text-gold" />
              <span className="font-display text-lg font-extrabold text-white">Gavl</span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/40">
              The live auction house where bids move in real time. Flash lots, Weekly Showdowns
              and leaderboards that play like a game.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-mint/25 bg-mint/[0.06] px-3 py-1.5 text-xs font-medium text-mint">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-live-pulse rounded-full bg-mint opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-mint" />
              </span>
              Floor is live
            </div>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title}>
              <div className="label-caps mb-4">{col.title}</div>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-white/45 transition-colors hover:text-white/80">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] pt-6 sm:flex-row">
          <span className="text-xs text-white/30">© {new Date().getFullYear()} Gavl.</span>
          <span className="text-xs text-white/30">Bid live. Win fast. Rank forever.</span>
        </div>
      </div>
    </footer>
  );
}