"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Flag, Loader2 } from "lucide-react";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/cn";
import type { DisputeDTO } from "@/server/disputes";

const statusCls: Record<string, string> = {
  OPEN: "border-ember/30 bg-ember/10 text-ember",
  RESOLVED_REFUNDED: "border-mint/30 bg-mint/10 text-mint",
  RESOLVED_REJECTED: "text-[#1a1408]/40",
  CANCELLED: "text-[#1a1408]/40",
};

const statusLabel: Record<string, string> = {
  OPEN: "Open",
  RESOLVED_REFUNDED: "Refunded",
  RESOLVED_REJECTED: "Sale upheld",
  CANCELLED: "Withdrawn",
};

function ResolveBox({ dispute }: { dispute: DisputeDTO }) {
  const router = useRouter();
  const [resolution, setResolution] = useState("");
  const [refundTx, setRefundTx] = useState("");
  const [busy, setBusy] = useState<"refund" | "reject" | null>(null);
  const [error, setError] = useState("");

  async function resolve(outcome: "refund" | "reject") {
    setBusy(outcome);
    setError("");
    try {
      const res = await fetch(`/api/disputes/${dispute.id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome, resolution: resolution.trim(), refundTxRef: refundTx.trim() || undefined }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.message || "Couldn't resolve the dispute.");
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-[#3c2d0f]/10 bg-white/50 p-3">
      <textarea
        value={resolution}
        onChange={(e) => setResolution(e.target.value)}
        rows={2}
        maxLength={2000}
        placeholder="Resolution note to buyer + seller (required)"
        className="w-full resize-none rounded-lg border border-[#3c2d0f]/15 bg-white/70 px-3 py-2 text-sm text-[#1a1408] placeholder:text-[#1a1408]/40 focus:border-gold/40 focus:outline-none"
      />
      <input
        value={refundTx}
        onChange={(e) => setRefundTx(e.target.value)}
        spellCheck={false}
        autoComplete="off"
        placeholder="Refund txid (64 hex, only if refunding)"
        className="mt-2 w-full rounded-lg border border-[#3c2d0f]/15 bg-white/70 px-3 py-2 font-mono text-xs text-[#1a1408] placeholder:font-sans placeholder:text-sm placeholder:text-[#1a1408]/40 focus:border-gold/40 focus:outline-none"
      />
      {error && <p className="mt-1.5 text-xs font-medium text-ember">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button
          onClick={() => resolve("refund")}
          disabled={busy != null}
          className="inline-flex items-center gap-1.5 rounded-xl bg-mint px-3 py-1.5 text-xs font-bold text-ink-950 disabled:opacity-60"
        >
          {busy === "refund" && <Loader2 size={13} className="animate-spin" />}
          Refund buyer (cancel order)
        </button>
        <button
          onClick={() => resolve("reject")}
          disabled={busy != null}
          className="rounded-xl border border-[#3c2d0f]/15 px-3 py-1.5 text-xs font-bold text-[#1a1408]/70 hover:border-[#3c2d0f]/30 disabled:opacity-60"
        >
          {busy === "reject" && <Loader2 size={13} className="animate-spin" />} Uphold sale
        </button>
      </div>
    </div>
  );
}

export function DisputesPanel({ disputes }: { disputes: DisputeDTO[] }) {
  if (disputes.length === 0) {
    return (
      <div className="panel-flat grid place-items-center gap-2 px-6 py-10 text-center">
        <Flag size={28} className="text-[#1a1408]/15" />
        <p className="font-display text-base font-semibold text-[#1a1408]/80">No disputes</p>
        <p className="max-w-sm text-sm text-[#1a1408]/45">Buyer complaints about paid orders land here.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {disputes.map((d) => (
        <div key={d.id} className="panel-flat p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("chip", statusCls[d.status])}>
              <Flag size={12} /> {statusLabel[d.status] ?? d.status}
            </span>
            <span className="text-sm font-bold text-[#1a1408]">{d.reason}</span>
            <span className="ml-auto text-xs text-[#1a1408]/35">{timeAgo(d.createdAt)}</span>
          </div>
          <Link href={`/listing/${d.listing.id}`} className="mt-1 block text-sm text-gold hover:underline">
            {d.listing.title}
          </Link>
          <p className="mt-1 text-xs text-[#1a1408]/45">
            Buyer @{d.buyer.handle} · Seller @{d.seller.handle}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#1a1408]/70">{d.details}</p>
          {d.resolution && (
            <p className="mt-2 rounded-lg bg-[#3c2d0f]/[0.04] px-3 py-2 text-sm text-[#1a1408]/70">
              <span className="font-semibold">Resolution: </span>
              {d.resolution}
            </p>
          )}
          {d.status === "OPEN" && <ResolveBox dispute={d} />}
        </div>
      ))}
    </div>
  );
}
