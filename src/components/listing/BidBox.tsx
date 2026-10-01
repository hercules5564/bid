"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Gavel, Zap, Lock, Loader2 } from "lucide-react";
import { formatMoney, formatMoneyShort, toRupees } from "@/lib/money";
import { useSession } from "@/components/providers/session";
import { cn } from "@/lib/cn";

export function BidBox({
  listingId,
  minNextBid,
  bidIncrement,
  buyNowPrice,
  disabled,
  isOwn,
}: {
  listingId: string;
  minNextBid: number; // paise
  bidIncrement: number; // paise
  buyNowPrice: number | null;
  disabled: boolean;
  isOwn: boolean;
}) {
  const user = useSession();
  const [amount, setAmount] = useState(() => toRupees(minNextBid));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const touched = useRef(false);

  // Keep the field at/above the live minimum unless the user typed something higher.
  useEffect(() => {
    setAmount((cur) => (!touched.current || cur < toRupees(minNextBid) ? toRupees(minNextBid) : cur));
  }, [minNextBid]);

  if (!user) {
    return (
      <div className="panel-flat p-4 text-center">
        <p className="text-sm text-[#1a1408]/60">Sign in to place a bid.</p>
        <Link href="/login" className="btn-gold mt-3 w-full">
          Sign in to bid
        </Link>
      </div>
    );
  }

  if (isOwn) {
    return (
      <div className="panel-flat flex items-center justify-center gap-2 p-4 text-sm text-[#1a1408]/45">
        <Lock size={15} /> This is your listing.
      </div>
    );
  }

  if (disabled) {
    return (
      <div className="panel-flat flex items-center justify-center gap-2 p-4 text-sm text-[#1a1408]/45">
        <Lock size={15} /> Bidding is closed.
      </div>
    );
  }

  const quick = [minNextBid, minNextBid + bidIncrement, minNextBid + bidIncrement * 4];

  async function place(paise: number) {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/listings/${listingId}/bid`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amount: paise }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.message || "Bid rejected.");
        if (data.minNextBid) setAmount(toRupees(data.minNextBid));
      } else {
        setFlash(true);
        touched.current = false;
        setTimeout(() => setFlash(false), 900);
      }
    } catch {
      setError("Network error — try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function buyNow() {
    if (!buyNowPrice || submitting) return;
    if (!window.confirm(`Buy this now for ${formatMoney(buyNowPrice)} and win instantly?`)) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/listings/${listingId}/buy-now`, { method: "POST" });
      const data = await res.json();
      if (!data.ok) setError(data.message || "Buy Now failed.");
    } catch {
      setError("Network error — try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={cn("panel-flat p-4 transition-shadow", flash && "shadow-glow-gold")}>
      <div className="flex flex-wrap gap-2">
        {quick.map((p, i) => (
          <button
            key={i}
            onClick={() => {
              touched.current = true;
              setAmount(toRupees(p));
            }}
            className="chip border-[#3c2d0f]/15 hover:border-gold/40 hover:text-gold"
          >
            {formatMoneyShort(p)}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-stretch gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-[#3c2d0f]/15 bg-white/70 px-3">
          <span className="text-[#1a1408]/40">₹</span>
          <input
            type="number"
            inputMode="numeric"
            value={amount}
            min={toRupees(minNextBid)}
            onChange={(e) => {
              touched.current = true;
              setAmount(Number(e.target.value));
            }}
            className="num w-full bg-transparent py-2.5 text-lg font-bold text-[#1a1408] focus:outline-none"
          />
        </div>
        <button
          onClick={() => place(Math.round(amount * 100))}
          disabled={submitting}
          className="btn-gold min-w-[7.5rem]"
        >
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Gavel size={16} />}
          Place bid
        </button>
      </div>

      <p className="mt-2 text-xs text-[#1a1408]/40">
        Minimum next bid <span className="num text-[#1a1408]/70">{formatMoney(minNextBid)}</span>
      </p>

      {error && <p className="mt-2 rounded-lg bg-ember/10 px-3 py-2 text-xs font-medium text-ember">{error}</p>}

      {buyNowPrice && (
        <button
          onClick={buyNow}
          disabled={submitting}
          className="btn-ghost mt-3 w-full border-arc/30 text-arc-soft hover:bg-arc/10"
        >
          <Zap size={15} /> Buy now for {formatMoney(buyNowPrice)}
        </button>
      )}
    </div>
  );
}
