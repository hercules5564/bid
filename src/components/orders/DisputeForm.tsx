"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Flag, Loader2 } from "lucide-react";
import { DISPUTE_REASON_OPTIONS } from "@/lib/disputes";

/** Buyer opens a dispute on a PAID order. Shows open/resolved state read-only. */
export function DisputeForm({
  orderId,
  dispute,
}: {
  orderId: string;
  dispute: { id: string; status: string } | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(DISPUTE_REASON_OPTIONS[0]);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (dispute) {
    const label =
      dispute.status === "OPEN"
        ? "Dispute under review"
        : dispute.status === "RESOLVED_REFUNDED"
          ? "Dispute resolved — refunded"
          : dispute.status === "RESOLVED_REJECTED"
            ? "Dispute resolved — sale upheld"
            : "Dispute withdrawn";
    const cls =
      dispute.status === "OPEN"
        ? "border-ember/30 bg-ember/10 text-ember"
        : dispute.status === "RESOLVED_REFUNDED"
          ? "border-mint/30 bg-mint/10 text-mint"
          : "text-[#1a1408]/40";
    return <span className={`chip ${cls}`}>{label}</span>;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/orders/${orderId}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, details: details.trim() }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.message || "Couldn't open the dispute.");
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
        className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-[#1a1408]/40 hover:text-ember"
      >
        <Flag size={13} /> Report a problem
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-ember/25 bg-ember/[0.04] p-3">
      <select
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        aria-label="Dispute reason"
        className="w-full rounded-lg border border-[#3c2d0f]/15 bg-white/70 px-3 py-2 text-sm text-[#1a1408] focus:border-ember/40 focus:outline-none"
      >
        {DISPUTE_REASON_OPTIONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <textarea
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        rows={3}
        maxLength={2000}
        required
        minLength={10}
        placeholder="What went wrong? (min 10 characters)"
        className="mt-2 w-full resize-none rounded-lg border border-[#3c2d0f]/15 bg-white/70 px-3 py-2 text-sm text-[#1a1408] placeholder:text-[#1a1408]/40 focus:border-ember/40 focus:outline-none"
      />
      {error && <p className="mt-1.5 text-xs font-medium text-ember">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-xl bg-ember px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
        >
          {busy && <Loader2 size={13} className="animate-spin" />} Open dispute
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
