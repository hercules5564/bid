"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";

type Cat = { name: string; slug: string };

const selectCls =
  "rounded-xl border border-white/10 bg-ink-850/60 px-3 py-2.5 text-sm text-white/85 focus:border-gold/40 focus:outline-none";

export function Filters({ categories }: { categories: Cat[] }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [min, setMin] = useState(sp.get("min") ?? "");
  const [max, setMax] = useState(sp.get("max") ?? "");

  const push = useCallback(
    (patch: Record<string, string | undefined>) => {
      const next = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v == null || v === "") next.delete(k);
        else next.set(k, v);
      }
      router.push(`/browse?${next.toString()}`);
    },
    [router, sp]
  );

  return (
    <div className="panel-flat mb-6 flex flex-wrap items-center gap-2 p-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          push({ q: q.trim() || undefined });
        }}
        className="flex min-w-[200px] flex-1 items-center gap-2 rounded-xl border border-white/10 bg-ink-850/60 px-3"
      >
        <Search size={15} className="text-white/35" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search lots…"
          className="w-full bg-transparent py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none"
        />
      </form>

      <select
        value={sp.get("category") ?? ""}
        onChange={(e) => push({ category: e.target.value || undefined })}
        className={selectCls}
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.name}
          </option>
        ))}
      </select>

      <select
        value={sp.get("duration") ?? ""}
        onChange={(e) => push({ duration: e.target.value || undefined })}
        className={selectCls}
      >
        <option value="">Any duration</option>
        <option value="HOURLY">⚡ Flash</option>
        <option value="DAILY">Daily</option>
        <option value="WEEKLY">Weekly</option>
      </select>

      <select
        value={sp.get("sort") ?? "ending"}
        onChange={(e) => push({ sort: e.target.value })}
        className={selectCls}
      >
        <option value="ending">Ending soon</option>
        <option value="newest">Newest</option>
        <option value="priceLow">Price ↑</option>
        <option value="priceHigh">Price ↓</option>
        <option value="mostBids">Most bids</option>
      </select>

      <div className="flex items-center gap-1">
        <span className="text-white/30">₹</span>
        <input
          value={min}
          onChange={(e) => setMin(e.target.value)}
          onBlur={() => push({ min: min || undefined })}
          onKeyDown={(e) => e.key === "Enter" && push({ min: min || undefined })}
          placeholder="min"
          inputMode="numeric"
          className="num w-20 rounded-xl border border-white/10 bg-ink-850/60 px-2.5 py-2.5 text-sm text-white focus:border-gold/40 focus:outline-none"
        />
        <span className="text-white/25">–</span>
        <input
          value={max}
          onChange={(e) => setMax(e.target.value)}
          onBlur={() => push({ max: max || undefined })}
          onKeyDown={(e) => e.key === "Enter" && push({ max: max || undefined })}
          placeholder="max"
          inputMode="numeric"
          className="num w-20 rounded-xl border border-white/10 bg-ink-850/60 px-2.5 py-2.5 text-sm text-white focus:border-gold/40 focus:outline-none"
        />
      </div>

      <label className="chip cursor-pointer select-none gap-2 text-white/60">
        <input
          type="checkbox"
          checked={sp.get("ended") === "1"}
          onChange={(e) => push({ ended: e.target.checked ? "1" : undefined })}
          className="accent-gold"
        />
        <SlidersHorizontal size={12} /> Include ended
      </label>
    </div>
  );
}
