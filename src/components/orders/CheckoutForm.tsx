"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, CheckCircle2 } from "lucide-react";
import { formatMoney } from "@/lib/money";
import type { OrderItem } from "@/types";

export function CheckoutForm({ order, providerLabel }: { order: OrderItem; providerLabel: string }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "" });
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState("");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
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
          <h2 className="font-display text-xl font-extrabold text-white">Payment complete</h2>
          <p className="mt-1 text-sm text-white/50">Thanks! The seller will get in touch to arrange delivery.</p>
        </div>
        <button onClick={() => router.push("/orders")} className="btn-gold mt-2">
          View your orders
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="label-caps">Full name</span>
          <input
            value={form.name}
            onChange={set("name")}
            required
            placeholder="Aarav Sharma"
            className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-gold/40 focus:outline-none"
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
            className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-gold/40 focus:outline-none"
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
          className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-gold/40 focus:outline-none"
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
          className="resize-none rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-gold/40 focus:outline-none"
        />
      </label>

      {error && (
        <p className="rounded-xl border border-ember/30 bg-ember/10 px-4 py-3 text-sm text-ember">{error}</p>
      )}

      <button type="submit" disabled={state === "loading"} className="btn-gold mt-1 w-full disabled:opacity-60">
        {state === "loading" ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Processing payment…
          </>
        ) : (
          <>Pay {formatMoney(order.amount)} now</>
        )}
      </button>

      <p className="flex items-center justify-center gap-1.5 text-xs text-white/35">
        <ShieldCheck size={13} className="text-mint" /> {providerLabel}
      </p>
    </form>
  );
}