import Link from "next/link";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { cn } from "@/lib/cn";

const accent: Record<string, string> = {
  gold: "text-gold",
  arc: "text-arc-soft",
  ember: "text-ember",
  mint: "text-mint",
};

type Cat = { name: string; slug: string; icon: string; accent: string; liveCount: number };

export function CategoryRail({ categories }: { categories: Cat[] }) {
  return (
    <div className="rail -mx-1 px-1">
      {categories.map((c) => (
        <Link
          key={c.slug}
          href={`/browse?category=${c.slug}`}
          className="group flex w-[150px] shrink-0 snap-start flex-col gap-3 rounded-2xl border border-white/[0.07] bg-ink-850/60 p-4 transition-all hover:-translate-y-0.5 hover:border-white/20"
        >
          <span className={cn("grid h-10 w-10 place-items-center rounded-xl bg-white/[0.04]", accent[c.accent] ?? "text-white")}>
            <CategoryIcon icon={c.icon} size={20} />
          </span>
          <div>
            <div className="text-sm font-semibold text-white">{c.name}</div>
            <div className="num text-xs text-white/40">{c.liveCount} live</div>
          </div>
        </Link>
      ))}
    </div>
  );
}
