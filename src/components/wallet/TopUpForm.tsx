"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, CreditCard } from "lucide-react";
import { getRateInfo } from "@/lib/usdt";
import { formatMoney } from "@/lib/money";
import { loadRazorpay, openRazorpay } from "@/lib/razorpay-checkout";

export function TopUpForm({
  escrowAddress,
  network,
  card,
}: {
  escrowAddress: string;
  network: string;
  /** Show the card/UPI option — true once Razorpay keys are set. */
  card?: boolean;
}) {
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

      {card ? (
        <>
          <div className="mt-5 flex items-center gap-3 text-xs text-[#1a1408]/35">
            <span className="h-px flex-1 bg-[#3c2d0f]/10" />
            or top up with card (₹)
            <span className="h-px flex-1 bg-[#3c2d0f]/10" />
          </div>
          <CardTopUp />
        </>
      ) : null}
    </div>
  );
}

/** Card/UPI top-up in rupees — shown when Razorpay keys are configured. */
function CardTopUp() {
  const router = useRouter();
  const [inr, setInr] = useState("1000");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paise = Math.round(Number(inr) * 100);
  const valid = inr.trim() !== "" && Number.isFinite(Number(inr)) && paise >= 100;

  async function pay() {
    if (busy) return;
    setTouched(true);
    if (!valid) {
      setError("Enter at least ₹1.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await fetch("/api/payments/razorpay/topup-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountPaise: paise }),
      }).then((r) => r.json());
      if (!created.ok) {
        setError(created.message || "Couldn't start the card payment.");
        return;
      }
      if (!(await loadRazorpay())) {
        setError("Couldn't load the payment window. Check your connection and retry.");
        return;
      }
      openRazorpay({
        key: created.keyId,
        amount: created.amount,
        currency: created.currency,
        orderId: created.razorpayOrderId,
        name: "Gavl",
        description: "Wallet top-up",
        onSuccess: async (resp) => {
          try {
            const settled = await fetch("/api/payments/razorpay/topup-verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                amountPaise: paise,
                razorpayOrderId: resp.razorpay_order_id,
                razorpayPaymentId: resp.razorpay_payment_id,
                signature: resp.razorpay_signature,
              }),
            }).then((r) => r.json());
            if (!settled.ok) {
              setError(settled.message || "Verification failed — don't pay again, contact support.");
              return;
            }
            router.refresh();
          } catch {
            setError("Verification failed — check your wallet before retrying.");
          }
        },
      });
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3">
      <div className="flex items-stretch gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-[#3c2d0f]/15 bg-white/70 px-3">
          <span className="text-[#1a1408]/40">₹</span>
          <input
            type="number"
            min={1}
            value={inr}
            onChange={(e) => {
              setInr(e.target.value);
              setTouched(true);
            }}
            onBlur={() => setTouched(true)}
            placeholder="1000"
            className="num w-full bg-transparent py-2.5 text-lg font-bold text-[#1a1408] focus:outline-none"
          />
        </div>
        <button onClick={pay} disabled={busy || !valid} className="btn-gold min-w-[9rem] disabled:opacity-50">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
          Pay with card
        </button>
      </div>
      {touched && !valid && <p className="mt-1 text-xs font-medium text-ember">Enter at least ₹1.</p>}
      {error && <p className="mt-2 rounded-lg bg-ember/10 px-3 py-2 text-xs font-medium text-ember">{error}</p>}
      <p className="mt-1 text-[11px] text-[#1a1408]/40">Credit/debit cards, UPI and netbanking via Razorpay.</p>
    </div>
  );
}
