"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { getRateInfo } from "@/lib/usdt";
import { formatMoney } from "@/lib/money";

export function TopUpForm({ escrowAddress, network }: { escrowAddress: string; network: string }) {
  const router = useRouter();
  const [usdt, setUsdt] = useState("100");
  const [touched, setTouched] = useState(false);
  const [rate, setRate] = useState<number | null>(null);
  const [cap, setCap] = useState<number>(10000);
  const [txRef, setTxRef] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    getRateInfo().then((r) => {
      if (!live) return;
      setRate(r.inrPerUsdt);
      setCap(r.maxTopupUsdt);
    });
    return () => {
      live = false;
    };
  }, []);

  // Blank, zero, negative and over-cap amounts are rejected up front — never submitted.
  const usdtNum = Number(usdt);
  const usdtValid =
    usdt.trim() !== "" && Number.isFinite(usdtNum) && usdtNum > 0 && usdtNum <= cap;
  const inrPaise = rate !== null && usdtValid ? Math.round(usdtNum * rate * 100) : null;

  async function submit() {
    if (submitting) return;
    setTouched(true);
    if (!usdtValid) {
      setError(
        usdt.trim() !== "" && Number(usdt) > cap
          ? `Top-ups are capped at ${cap.toLocaleString("en-US")} USDT for now.`
          : "Enter a top-up amount above 0 USDT."
      );
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const r = rate ?? (await getRateInfo()).inrPerUsdt;
      const paise = Math.round(usdtNum * r * 100);
      const res = await fetch("/api/wallet/topup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rupees: paise / 100, txRef: txRef.trim() }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.message || "Top-up failed.");
      } else {
        setSuccess(`${usdtNum} USDT (≈ ${formatMoney(paise)}) added to your wallet.`);
        setTxRef("");
        router.refresh();
      }
    } catch {
      setError("Network error — try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="panel p-5">
      <h2 className="text-base font-bold">Top up wallet</h2>
      <p className="mt-1 text-sm text-[#1a1408]/60">
        Send USDT to the escrow address, then enter the USDT amount and paste the transaction hash.
      </p>

      {escrowAddress ? (
        <div className="mt-3 rounded-xl border border-[#3c2d0f]/15 bg-white/60 p-3">
          <p className="label-caps">Escrow address · {network}</p>
          <p className="num mt-1 break-all text-sm font-semibold">{escrowAddress}</p>
        </div>
      ) : (
        <p className="mt-3 rounded-xl bg-ember/10 px-3 py-2 text-xs font-medium text-ember">
          Escrow address not set yet — admin adds it in .env as ESCROW_USDT_ADDRESS. Demo top-ups below still work.
        </p>
      )}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="label-caps">Amount (USDT)</span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={usdt}
            onChange={(e) => {
              setUsdt(e.target.value);
              setTouched(true);
            }}
            onBlur={() => setTouched(true)}
            placeholder="100"
            className="num mt-1 w-full rounded-xl border border-[#3c2d0f]/15 bg-white/70 px-3 py-2.5 text-lg font-bold focus:outline-none"
          />
          {touched && !usdtValid && (
            <p className="mt-1 text-xs font-medium text-ember">
              {usdt.trim() !== "" && Number(usdt) > cap
                ? `Max ${cap.toLocaleString("en-US")} USDT per top-up.`
                : "Amount must be above 0 USDT."}
            </p>
          )}
          {usdtValid && inrPaise !== null && (
            <p className="num mt-1 text-xs font-medium text-[#1a1408]/55">≈ {formatMoney(inrPaise)} credited</p>
          )}
        </label>
        <label className="block">
          <span className="label-caps">Transaction hash (64 hex chars)</span>
          <input
            value={txRef}
            onChange={(e) => setTxRef(e.target.value)}
            placeholder="a3f9…"
            spellCheck={false}
            className="num mt-1 w-full rounded-xl border border-[#3c2d0f]/15 bg-white/70 px-3 py-2.5 font-mono text-sm focus:outline-none"
          />
        </label>
      </div>

      {error && <p className="mt-2 rounded-lg bg-ember/10 px-3 py-2 text-xs font-medium text-ember">{error}</p>}
      {success && <p className="mt-2 rounded-lg bg-mint/15 px-3 py-2 text-xs font-medium text-mint-deep">{success}</p>}

      <button onClick={submit} disabled={submitting || !usdtValid} className="btn-gold mt-3 w-full sm:w-auto">
        {submitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
        Add funds
      </button>
    </div>
  );
}
