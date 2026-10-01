"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid, Loader2, PlusSquare, Timer } from "lucide-react";
import { StyledSelect } from "@/components/ui/StyledSelect";

type Cat = { name: string; slug: string };
const field = "w-full rounded-xl border border-[#3c2d0f]/15 bg-white/70 px-3 py-2.5 text-sm font-medium text-[#1a1408] placeholder:font-normal placeholder:text-[#1a1408]/40 transition-all duration-200 hover:border-[#3c2d0f]/30 hover:bg-white focus:border-gold/60 focus:bg-white focus:shadow-glow-gold focus:outline-none focus:ring-2 focus:ring-gold/20";
const label = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#1a1408]/40";

const SAMPLE = "https://picsum.photos/seed/gavl-new/900/675";

export function CreateListingForm({ categories }: { categories: Cat[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState("DAILY");
  const [cat, setCat] = useState(categories[0]?.slug ?? "");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const images = String(f.get("images") || "")
      .split(/\n|,/)
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      title: String(f.get("title") || ""),
      description: String(f.get("description") || ""),
      images: images.length ? images : [SAMPLE],
      categorySlug: String(f.get("categorySlug") || ""),
      startingPrice: Number(f.get("startingPrice")),
      bidIncrement: Number(f.get("bidIncrement")),
      buyNowPrice: f.get("buyNowPrice") ? Number(f.get("buyNowPrice")) : null,
      durationType: duration,
      hours: duration === "HOURLY" ? Number(f.get("hours") || 3) : undefined,
      startInMinutes: Number(f.get("startInMinutes") || 0),
    };

    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) setError(data.error || "Could not create listing.");
      else {
        router.push(`/listing/${data.id}`);
        router.refresh();
      }
    } catch {
      setError("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="panel flex flex-col gap-4 p-5">
      <div>
        <label className={label}>Title</label>
        <input name="title" required minLength={3} placeholder="1965 Rolex Daytona…" className={field} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>Category</label>
          <StyledSelect
            ariaLabel="Listing category"
            icon={<LayoutGrid size={15} />}
            value={cat}
            onChange={setCat}
            filledValue="__none__"
            className="w-full"
            options={categories.map((c) => ({ value: c.slug, label: c.name }))}
          />
          {/* hidden input keeps native form submission working */}
          <input type="hidden" name="categorySlug" value={cat} />
        </div>
        <div>
          <label className={label}>Duration</label>
          <StyledSelect
            ariaLabel="Listing duration"
            icon={<Timer size={15} />}
            value={duration}
            filledValue="__none__"
            onChange={setDuration}
            className="w-full"
            options={[
              { value: "HOURLY", label: "Flash · hourly" },
              { value: "DAILY", label: "Daily · 24h" },
              { value: "WEEKLY", label: "Weekly · 7d" },
            ]}
          />
        </div>
      </div>

      <div>
        <label className={label}>Description</label>
        <textarea name="description" required minLength={10} rows={3} placeholder="Condition, provenance, what's included…" className={field} />
      </div>

      <div>
        <label className={label}>Image URLs — one per line</label>
        <textarea name="images" rows={2} placeholder={SAMPLE} className={field} />
        <p className="mt-1 text-xs text-[#1a1408]/30">Leave blank to use a placeholder image.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className={label}>Starting price (₹)</label>
          <input name="startingPrice" type="number" required min={1} defaultValue={1000} className={`num ${field}`} />
        </div>
        <div>
          <label className={label}>Min raise (₹)</label>
          <input name="bidIncrement" type="number" required min={1} defaultValue={100} className={`num ${field}`} />
        </div>
        <div>
          <label className={label}>Buy now (₹, optional)</label>
          <input name="buyNowPrice" type="number" min={1} placeholder="—" className={`num ${field}`} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {duration === "HOURLY" && (
          <div>
            <label className={label}>Hours live (1–6)</label>
            <input name="hours" type="number" min={1} max={6} defaultValue={3} className={`num ${field}`} />
          </div>
        )}
        <div>
          <label className={label}>Start in (minutes)</label>
          <input name="startInMinutes" type="number" min={0} defaultValue={0} className={`num ${field}`} />
        </div>
      </div>

      {error && <p className="rounded-lg bg-ember/10 px-3 py-2 text-sm font-medium text-ember">{error}</p>}

      <button type="submit" disabled={busy} className="btn-gold">
        {busy ? <Loader2 size={16} className="animate-spin" /> : <PlusSquare size={16} />}
        Publish listing
      </button>
    </form>
  );
}
