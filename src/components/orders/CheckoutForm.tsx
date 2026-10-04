"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, ShieldCheck, CheckCircle2, QrCode } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { DualMoney } from "@/components/money/DualMoney";
import type { OrderItem } from "@/types";
import { cn } from "@/lib/cn";

type BybitPayment = {
  payId: string;
  qrContent: string;
  checkoutLink: string;
  expireTime: number;
  usdtAmount: string;
};

/** Pay with Bybit: scan the QR in the Bybit app. Polls until PAY_SUCCESS. */
function BybitButton({
  order,
  contact,
  onDone,
}: {
  order: OrderItem;
  contact: { name: string; email: string; phone: string; address: string };
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [pay, setPay] = useState<BybitPayment | null>(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);

  async function checkStatus(p: BybitPayment) {
    try {
      const res = await fetch("/api/payments/bybit/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          payId: p.payId,
          contactName: contact.name,
          contactEmail: contact.email,
          contactPhone: contact.phone,
          shipTo: contact.address,
        }),
      }).then((r) => r.json());
      if (res.ok) {
        stop();
        onDone();
      }
      // "pending" just means keep waiting — the manual button retries loudly.
    } catch {
      /* polling is best-effort */
    }
  }

  async function start() {
    if (!contact.name.trim() || !contact.email.trim() || !contact.phone.trim() || !contact.address.trim()) {
      setError("Fill in your name, email, phone and delivery address below first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/payments/bybit/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
      }).then((r) => r.json());
      if (!res.ok) {
        setError(res.message || "Couldn't start the Bybit payment.");
        return;
      }
      const p = res as BybitPayment;
      setPay(p);
      setChecking(true);
      stop();
      timer.current = setInterval(() => checkStatus(p), 3000);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (pay) {
    return (
      <div className="rounded-xl border border-gold/25 bg-gold/[0.06] p-4 text-center">
        <div className="text-xs font-bold uppercase tracking-wide text-gold">
          Pay {pay.usdtAmount} USDT with Bybit
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={pay.qrContent} alt="Scan with your Bybit app to pay" className="mx-auto mt-3 h-52 w-52 rounded-lg bg-white p-2" />
        <p className="mt-2 text-xs text-[#1a1408]/55">
          Scan with your Bybit app — or{" "}
          <a href={pay.checkoutLink} target="_blank" rel="noreferrer" className="font-semibold text-gold hover:underline">
            open the Bybit checkout
          </a>
          .
        </p>
        <p className="mt-1 flex items-center justify-center gap-1.5 text-xs text-[#1a1408]/40">
          {checking && <Loader2 size={12} className="animate-spin" />}
          Waiting for Bybit confirmation…
        </p>
        <div className="mt-3 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => checkStatus(pay)}
            className="rounded-xl border border-[#3c2d0f]/15 px-3 py-1.5 text-xs font-bold text-[#1a1408]/70 hover:border-gold/40"
          >
            I&apos;ve paid — check now
          </button>
          <button
            type="button"
            onClick={() => {
              stop();
              setPay(null);
              setChecking(false);
            }}
            className="rounded-xl px-3 py-1.5 text-xs font-semibold text-[#1a1408]/50 hover:text-[#1a1408]"
          >
            Cancel
          </button>
        </div>
        {error && <p className="mt-2 text-xs font-medium text-ember">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={start}
        disabled={busy}
        className="btn-gold w-full disabled:opacity-60"
      >
        {busy ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Creating Bybit payment…
          </>
        ) : (
          <>
            <QrCode size={16} /> Pay <DualMoney paise={order.amount} short /> with Bybit
          </>
        )}
      </button>
      {error && (
        <p className="mt-2 rounded-xl border border-ember/30 bg-ember/10 px-4 py-3 text-sm text-ember">{error}</p>
      )}
    </div>
  );
}

export function CheckoutForm({
  order,
  providerLabel,
  usdtAddress,
  network,
  fee,
  sellerPayout,
  feePercent,
  bybit,
}: {
  order: OrderItem;
  providerLabel: string;
  usdtAddress: string;
  network: string;
  fee: number;
  sellerPayout: number;
  feePercent: number;
  /** Show the Bybit Pay QR option — true once merchant credentials are set. */
  bybit?: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", txRef: "" });
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const txLooksValid = /^[a-fA-F0-9]{64}$/.test(form.txRef.trim());

  async function copyAddress() {
    if (!usdtAddress) return;
    try {
      await navigator.clipboard.writeText(usdtAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — user can copy manually */
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!txLooksValid) {
      setState("error");
      setError("That transaction hash doesn't look right — it should be 64 hex characters from your wallet.");
      return;
    }
    setState("loading");
    setError("");
    try {
      const res = await fetch(`/api/orders/${order.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactName: form.name,
          contactEmail: form.email,
          contactPhone: form.phone,
          shipTo: form.address,
          txRef: form.txRef.trim(),
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setState("error");
        setError(data.message || "Payment failed. Please try again.");
        return;
      }
      setState("done");
      router.refresh();
    } catch {
      setState("error");
      setError("Something went wrong. Please try again.");
    }
  }

  if (state === "done") {
    return (
      <div className="panel flex flex-col items-center gap-4 p-10 text-center">
        <CheckCircle2 size={40} className="text-mint" />
        <div>
          <h2 className="font-display text-xl font-extrabold text-[#1a1408]">Payment complete</h2>
          <p className="mt-1 text-sm text-[#1a1408]/50">Thanks! The seller will get in touch to arrange delivery.</p>
        </div>
        <button onClick={() => router.push("/orders")} className="btn-gold mt-2">
          View your orders
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {bybit ? (
        <>
          <BybitButton
            order={order}
            contact={{ name: form.name, email: form.email, phone: form.phone, address: form.address }}
            onDone={() => {
              setState("done");
              router.refresh();
            }}
          />
          <div className="flex items-center gap-3 text-xs text-[#1a1408]/35">
            <span className="h-px flex-1 bg-[#3c2d0f]/10" />
            or pay manually with USDT
            <span className="h-px flex-1 bg-[#3c2d0f]/10" />
          </div>
        </>
      ) : null}
      {/* Step 1 — send */}
      <div className="rounded-xl border border-gold/25 bg-gold/[0.06] px-4 py-3 text-sm text-[#1a1408]/80">
        <div className="text-xs font-bold uppercase tracking-wide">
          <span className="mr-1.5 inline-grid h-5 w-5 place-items-center rounded-full bg-gold/20 align-middle text-[11px] text-gold-deep">1</span>
          <span className="font-bold text-gold">Send USDT to Gavl escrow ({network})</span>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-[#1a1408]/60">
          Money comes to Gavl first. After delivery is confirmed, Gavl keeps {feePercent}% (
          <DualMoney paise={fee} short />) and sends <DualMoney paise={sellerPayout} short /> to the seller.
        </p>
        {usdtAddress ? (
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-black/[0.04] px-2.5 py-2">
            <p className="min-w-0 flex-1 break-all font-mono text-xs font-medium text-[#1a1408]">{usdtAddress}</p>
            <button
              type="button"
              onClick={copyAddress}
              aria-label="Copy escrow address"
              className="grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-md border border-[#3c2d0f]/15 bg-white/70 text-[#1a1408]/60 transition-colors duration-200 hover:border-gold/40 hover:text-gold-deep"
            >
              {copied ? <Check size={14} className="text-mint" /> : <Copy size={14} />}
            </button>
          </div>
        ) : (
          <p className="mt-2 text-xs text-[#1a1408]/50">
            Escrow address not set yet — admin adds it in .env as ESCROW_USDT_ADDRESS. Demo pay below moves no
            real money.
          </p>
        )}
      </div>

      {/* Step 2 — prove it */}
      <label className="flex flex-col gap-1.5">
        <span className="label-caps">
          <span className="mr-1.5 inline-grid h-5 w-5 place-items-center rounded-full bg-gold/20 align-middle text-[11px] text-gold-deep normal-case tracking-normal">2</span>
          Transaction hash
        </span>
        <input
          value={form.txRef}
          onChange={set("txRef")}
          required
          spellCheck={false}
          autoComplete="off"
          placeholder="e.g. 9f2c…a41b (64 hex characters)"
          className={cn(
            "rounded-xl border bg-[#3c2d0f]/[0.05] px-3.5 py-2.5 font-mono text-xs text-[#1a1408] placeholder:font-sans placeholder:text-sm placeholder:text-[#1a1408]/40 focus:outline-none",
            form.txRef === "" || txLooksValid
              ? "border-[#3c2d0f]/15 focus:border-gold/40"
              : "border-ember/40 focus:border-ember/60"
          )}
        />
        <span className={cn("text-xs", form.txRef !== "" && !txLooksValid ? "text-ember" : "text-[#1a1408]/40")}>
          {form.txRef !== "" && !txLooksValid
            ? `Keep going — ${form.txRef.trim().length}/64 characters, hex (0-9, a-f) only.`
            : "Paste the txid from your wallet after sending. Nothing is marked paid without it."}
        </span>
      </label>

      {/* Step 3 — details */}
      <div className="label-caps">
        <span className="mr-1.5 inline-grid h-5 w-5 place-items-center rounded-full bg-gold/20 align-middle text-[11px] text-gold-deep normal-case tracking-normal">3</span>
        Delivery details
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="label-caps">Full name</span>
          <input
            value={form.name}
            onChange={set("name")}
            required
            placeholder="Aarav Sharma"
            className="rounded-xl border border-[#3c2d0f]/15 bg-[#3c2d0f]/[0.05] px-3.5 py-2.5 text-sm text-[#1a1408] placeholder:text-[#1a1408]/40 focus:border-gold/40 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="label-caps">Email</span>
          <input
            type="email"
            value={form.email}
            onChange={set("email")}
            required
            placeholder="you@email.com"
            className="rounded-xl border border-[#3c2d0f]/15 bg-[#3c2d0f]/[0.05] px-3.5 py-2.5 text-sm text-[#1a1408] placeholder:text-[#1a1408]/40 focus:border-gold/40 focus:outline-none"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="label-caps">Phone</span>
        <input
          value={form.phone}
          onChange={set("phone")}
          required
          placeholder="+91 98765 43210"
          className="rounded-xl border border-[#3c2d0f]/15 bg-[#3c2d0f]/[0.05] px-3.5 py-2.5 text-sm text-[#1a1408] placeholder:text-[#1a1408]/40 focus:border-gold/40 focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="label-caps">Delivery address / pickup</span>
        <textarea
          value={form.address}
          onChange={set("address")}
          required
          rows={3}
          placeholder="Flat / street, city, pincode…"
          className="resize-none rounded-xl border border-[#3c2d0f]/15 bg-[#3c2d0f]/[0.05] px-3.5 py-2.5 text-sm text-[#1a1408] placeholder:text-[#1a1408]/40 focus:border-gold/40 focus:outline-none"
        />
      </label>

      {error && (
        <p className="rounded-xl border border-ember/30 bg-ember/10 px-4 py-3 text-sm text-ember">{error}</p>
      )}

      <button type="submit" disabled={state === "loading"} className="btn-gold mt-1 w-full disabled:opacity-60">
        {state === "loading" ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Verifying transfer…
          </>
        ) : (
          <>Confirm <DualMoney paise={order.amount} short /> transfer</>
        )}
      </button>

      <p className="flex items-center justify-center gap-1.5 text-xs text-[#1a1408]/35">
        <ShieldCheck size={13} className="text-mint" /> {providerLabel}
      </p>
    </form>
  );
}