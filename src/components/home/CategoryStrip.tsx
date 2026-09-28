import Link from "next/link";
import { ArrowRight, LayoutGrid } from "lucide-react";
import type { CategoryWithCount } from "@/server/listings";
import { CategoryIcon } from "@/components/ui/CategoryIcon";

export function CategoryStrip({ categories }: { categories: CategoryWithCount[] }) {
  if (categories.length === 0) return null;
  return (
    <section className="mx-auto max-w-6xl px-1 pb-20 sm:pb-24">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="label-caps mb-1 flex items-center gap-1.5">
            <LayoutGrid size={13} /> Browse the house
          </div>
          <h2 className="font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Every category, live on the floor.
          </h2>
        </div>
        <Link
          href="/browse"
          className="group inline-flex shrink-0 items-center gap-1 text-sm font-medium text-white/50 transition-colors hover:text-gold"
        >
          View all lots <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/browse?category=${c.slug}`}
            className="group flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-ink-850/60 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/[0.14]"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/[0.07] bg-white/[0.04] text-white/60 transition-colors group-hover:text-gold">
              <CategoryIcon icon={c.icon} size={18} />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-display text-sm font-bold text-white group-hover:text-gold">
                {c.name}
              </span>
              <span className="num text-xs text-white/40">
                {c.liveCount} live{c.liveCount === 1 ? "" : "s"}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}