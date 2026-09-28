import Link from "next/link";
import { Gavel, ChevronRight } from "lucide-react";
import type { ListingSummary } from "@/types";
import { ListingCard } from "@/components/listing/ListingCard";

export function HeroSection({ items }: { items: ListingSummary[] }) {
  return (
    <section className="relative overflow-hidden pb-12 pt-20 sm:pt-28">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-gold/[0.08] blur-[140px]" />
        <div className="absolute left-1/3 top-20 h-[400px] w-[500px] -translate-x-1/2 rounded-full bg-arc/[0.07] blur-[120px]" />
      </div>

      <div className="mx-auto max-w-3xl text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white/60 backdrop-blur">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-live-pulse rounded-full bg-mint opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-mint" />
          </span>
          Live auctions, decided in seconds
        </div>

        <h1 className="font-display text-5xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-6xl lg:text-7xl">
          The live auction house{" "}
          <span className="bg-gradient-to-r from-gold-soft via-gold to-gold-deep bg-clip-text text-transparent">
            where bids move in real time.
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-white/50">
          Flash lots, week-long headliners, a rotating Weekly Showdown and leaderboards that
          play like a game. Every bid is server-authoritative and lands instantly.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/signup" className="btn-gold">
            <Gavel size={16} /> Start bidding
          </Link>
          <Link
            href="/browse"
            className="btn-ghost"
          >
            Browse the floor <ChevronRight size={16} className="opacity-50" />
          </Link>
        </div>
      </div>

      {items.length > 0 && (
        <div className="mx-auto mt-16 max-w-5xl">
          <div className="rounded-2xl border border-white/[0.06] bg-ink-950/50 p-2 backdrop-blur-xl sm:p-3">
            <div className="flex items-center gap-2 rounded-xl border-b border-white/[0.05] px-4 py-2.5">
              <div className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full bg-white/10" />
                <span className="h-3 w-3 rounded-full bg-white/10" />
                <span className="h-3 w-3 rounded-full bg-white/10" />
              </div>
              <div className="ml-3 flex-1 rounded-lg bg-white/[0.04] px-3 py-1 text-center font-mono text-xs text-white/35">
                gavl.app/browse
              </div>
            </div>
            <div className="grid gap-3 pt-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.slice(0, 6).map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}