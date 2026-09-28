import Link from "next/link";
import { Gavel, ArrowRight } from "lucide-react";

export function CtaSection() {
  return (
    <section className="mx-auto max-w-6xl px-1 pb-24">
      <div className="relative overflow-hidden rounded-3xl border border-gold/[0.18] bg-gradient-to-b from-ink-850 to-ink-950 px-6 py-16 text-center sm:px-12">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-64 w-[500px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-gold/[0.12] blur-[100px]" />
        </div>

        <h2 className="relative font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          The next lot is already on the floor.
        </h2>
        <p className="relative mx-auto mt-4 max-w-xl text-white/50">
          Create a free account, place your first bid in seconds, and watch the leaderboards climb.
        </p>

        <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/signup" className="btn-gold">
            <Gavel size={16} /> Join the floor
          </Link>
          <Link href="/showdown" className="btn-ghost">
            See the Showdown <ArrowRight size={16} className="opacity-50" />
          </Link>
        </div>
      </div>
    </section>
  );
}