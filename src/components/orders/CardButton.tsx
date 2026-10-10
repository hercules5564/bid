"use client";
import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { loadRazorpay, openRazorpay } from "@/lib/razorpay-checkout";
import type { OrderItem } from "@/types";

/** Pay by card/UPI: server creates the order, Razorpay modal collects details. */
export function CardButton({
  order,
  contact,
  onDone,
}: {
  order: OrderItem;
  contact: { name: string; email: string; phone: string; address: string };
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    if (!contact.name.trim() || !contact.email.trim() || !contact.phone.trim() || !contact.address.trim()) {
      setError("Fill in your name, email, phone and delivery address below first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const created = await fetch("/api/payments/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id }),
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
        description: `Order for ${order.listing.title}`.slice(0, 100),
        prefill: { name: contact.name, email: contact.email, contact: contact.phone },
        onSuccess: async (resp) => {
          try {
            const settled = await fetch("/api/payments/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: order.id,
                razorpayOrderId: resp.razorpay_order_id,
                razorpayPaymentId: resp.razorpay_payment_id,
                signature: resp.razorpay_signature,
                contactName: contact.name,
                contactEmail: contact.email,
                contactPhone: contact.phone,
                shipTo: contact.address,
              }),
            }).then((r) => r.json());
            if (!settled.ok) {
              setError(settled.message || "Payment verification failed. Contact support — don't pay again.");
              return;
            }
            onDone();
          } catch {
            setError("Verification failed — check your orders before retrying.");
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
    <div>
      <button type="button" onClick={start} disabled={busy} className="btn-gold w-full disabled:opacity-60">
        {busy ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Starting secure payment…
          </>
        ) : (
          <>
            <CreditCard size={16} /> Pay {formatMoney(order.amount)} with card
          </>
        )}
      </button>
      {error && <p className="mt-2 text-xs font-medium text-ember">{error}</p>}
    </div>
  );
}
