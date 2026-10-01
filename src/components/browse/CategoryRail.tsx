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
          className="group flex w-[150px] shrink-0 snap-start flex-col gap-3 rounded-2xl border border-[#3c2d0f]/15 bg-white/70 p-4 transition-all hover:-translate-y-0.5 hover:border-white/20"
        >
          <span className={cn("grid h-10 w-10 place-items-center rounded-xl bg-[#3c2d0f]/[0.05]", accent[c.accent] ?? "text-[#1a1408]")}>
            <CategoryIcon icon={c.icon} size={20} />
          </span>
          <div>
            <div className="text-sm font-semibold text-[#1a1408]">{c.name}</div>
            <div className="num text-xs text-[#1a1408]/40">{c.liveCount} live</div>
          </div>
        </Link>
      ))}
    </div>
  );
}
