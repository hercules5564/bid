"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquareHeart } from "lucide-react";
import { StarPicker, Stars } from "@/components/reviews/Stars";

/** Buyer rates the seller for a PAID order. Renders existing review read-only. */
export function ReviewForm({
  orderId,
  existing,
}: {
  orderId: string;
  existing: { rating: number; comment: string | null } | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (existing) {
    return (
      <div className="flex items-center gap-2 text-xs text-[#1a1408]/55">
        <Stars value={existing.rating} size={13} />
        <span className="font-semibold text-[#1a1408]/70">Your {existing.rating}/5 review</span>
        {existing.comment && <span className="truncate text-[#1a1408]/40">“{existing.comment}”</span>}
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/orders/${orderId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: comment.trim() || undefined }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.message || "Couldn't save your review.");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-gold hover:underline"
      >
        <MessageSquareHeart size={13} /> Rate the seller
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-gold/25 bg-gold/[0.05] p-3">
      <StarPicker value={rating} onChange={setRating} />
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        maxLength={1000}
        placeholder="How was the seller? (optional)"
        className="mt-2 w-full resize-none rounded-lg border border-[#3c2d0f]/15 bg-white/70 px-3 py-2 text-sm text-[#1a1408] placeholder:text-[#1a1408]/40 focus:border-gold/40 focus:outline-none"
      />
      {error && <p className="mt-1.5 text-xs font-medium text-ember">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button type="submit" disabled={busy} className="btn-gold !px-3 !py-1.5 !text-xs disabled:opacity-60">
          {busy ? <Loader2 size={13} className="animate-spin" /> : "Submit review"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-xl px-3 py-1.5 text-xs font-semibold text-[#1a1408]/50 hover:text-[#1a1408]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
