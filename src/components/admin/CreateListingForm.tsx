"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PlusSquare } from "lucide-react";

type Cat = { name: string; slug: string };
const field = "w-full rounded-xl border border-white/10 bg-ink-900/60 px-3 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-gold/40 focus:outline-none";
const label = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/40";

const SAMPLE = "https://picsum.photos/seed/gavl-new/900/675";

export function CreateListingForm({ categories }: { categories: Cat[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState("DAILY");

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
          <select name="categorySlug" required className={field}>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Duration</label>
          <select name="durationType" value={duration} onChange={(e) => setDuration(e.target.value)} className={field}>
            <option value="HOURLY">Flash (hourly)</option>
            <option value="DAILY">Daily (24h)</option>
            <option value="WEEKLY">Weekly (7d)</option>
          </select>
        </div>
      </div>

      <div>
        <label className={label}>Description</label>
        <textarea name="description" required minLength={10} rows={3} placeholder="Condition, provenance, what's included…" className={field} />
      </div>

      <div>
        <label className={label}>Image URLs — one per line</label>
        <textarea name="images" rows={2} placeholder={SAMPLE} className={field} />
        <p className="mt-1 text-xs text-white/30">Leave blank to use a placeholder image.</p>
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
