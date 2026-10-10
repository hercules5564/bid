// Razorpay Checkout.js (card/UPI/netbanking modal) loader + opener.
// The modal runs on Razorpay's domain; our server verifies everything after.

export type RzpCheckoutResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export function loadRazorpay(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export function openRazorpay(input: {
  key: string;
  amount: number;
  currency: string;
  orderId: string;
  name: string;
  description: string;
  prefill?: { name?: string; email?: string; contact?: string };
  onSuccess: (r: RzpCheckoutResponse) => void;
  onDismiss?: () => void;
}): void {
  if (!window.Razorpay) return;
  const rzp = new window.Razorpay({
    key: input.key,
    amount: input.amount,
    currency: input.currency,
    name: input.name,
    description: input.description,
    order_id: input.orderId,
    prefill: input.prefill,
    theme: { color: "#e8b34a" },
    handler: input.onSuccess,
    modal: { ondismiss: input.onDismiss },
  });
  rzp.open();
}
