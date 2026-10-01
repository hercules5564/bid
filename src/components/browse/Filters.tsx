"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { ArrowDownWideNarrow, LayoutGrid, Search, SlidersHorizontal, Timer } from "lucide-react";
import { StyledSelect } from "@/components/ui/StyledSelect";

type Cat = { name: string; slug: string };

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
        className="flex min-w-[200px] flex-1 items-center gap-2 rounded-xl border border-[#3c2d0f]/15 bg-white/70 px-3 transition-all duration-200 hover:border-[#3c2d0f]/30 hover:bg-white focus-within:border-gold/60 focus-within:bg-white focus-within:shadow-glow-gold focus-within:ring-2 focus-within:ring-gold/20"
      >
        <Search size={15} className="shrink-0 text-[#1a1408]/35" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search lots…"
          aria-label="Search lots"
          className="w-full bg-transparent py-2.5 text-sm font-medium text-[#1a1408] placeholder:font-normal placeholder:text-[#1a1408]/40 focus:outline-none"
        />
      </form>

      <StyledSelect
        ariaLabel="Filter by category"
        icon={<LayoutGrid size={15} />}
        value={sp.get("category") ?? ""}
        onChange={(v) => push({ category: v || undefined })}
        options={[{ value: "", label: "All categories" }, ...categories.map((c) => ({ value: c.slug, label: c.name }))]}
      />

      <StyledSelect
        ariaLabel="Filter by duration"
        icon={<Timer size={15} />}
        value={sp.get("duration") ?? ""}
        onChange={(v) => push({ duration: v || undefined })}
        options={[
          { value: "", label: "Any duration" },
          { value: "HOURLY", label: "Flash · hourly" },
          { value: "DAILY", label: "Daily · 24h" },
          { value: "WEEKLY", label: "Weekly · 7d" },
        ]}
      />

      <StyledSelect
        ariaLabel="Sort lots"
        icon={<ArrowDownWideNarrow size={15} />}
        value={sp.get("sort") ?? "ending"}
        filledValue="ending"
        onChange={(v) => push({ sort: v })}
        options={[
          { value: "ending", label: "Ending soon" },
          { value: "newest", label: "Newest" },
          { value: "priceLow", label: "Price: low to high" },
          { value: "priceHigh", label: "Price: high to low" },
          { value: "mostBids", label: "Most bids" },
        ]}
      />

      <div className="flex items-center gap-1.5">
        <span className="text-sm font-semibold text-[#1a1408]/30">₹</span>
        <input
          value={min}
          onChange={(e) => setMin(e.target.value)}
          onBlur={() => push({ min: min || undefined })}
          onKeyDown={(e) => e.key === "Enter" && push({ min: min || undefined })}
          placeholder="min"
          aria-label="Minimum price"
          inputMode="numeric"
          className="num w-20 rounded-xl border border-[#3c2d0f]/15 bg-white/70 px-2.5 py-2.5 text-sm font-medium text-[#1a1408] transition-all duration-200 hover:border-[#3c2d0f]/30 hover:bg-white focus:border-gold/60 focus:bg-white focus:shadow-glow-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
        />
        <span className="text-[#1a1408]/25">–</span>
        <input
          value={max}
          onChange={(e) => setMax(e.target.value)}
          onBlur={() => push({ max: max || undefined })}
          onKeyDown={(e) => e.key === "Enter" && push({ max: max || undefined })}
          placeholder="max"
          aria-label="Maximum price"
          inputMode="numeric"
          className="num w-20 rounded-xl border border-[#3c2d0f]/15 bg-white/70 px-2.5 py-2.5 text-sm font-medium text-[#1a1408] transition-all duration-200 hover:border-[#3c2d0f]/30 hover:bg-white focus:border-gold/60 focus:bg-white focus:shadow-glow-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
        />
      </div>

      <label className="chip cursor-pointer select-none gap-2 text-[#1a1408]/60 transition-colors duration-200 hover:border-[#3c2d0f]/30 hover:bg-white hover:text-[#1a1408]">
        <input
          type="checkbox"
          checked={sp.get("ended") === "1"}
          onChange={(e) => push({ ended: e.target.checked ? "1" : undefined })}
          className="h-3.5 w-3.5 cursor-pointer accent-[#b8842a]"
        />
        <SlidersHorizontal size={12} /> Include ended
      </label>
    </div>
  );
}
