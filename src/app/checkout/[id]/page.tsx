import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Package, Clock3 } from "lucide-react";
import { getSessionUserId } from "@/lib/auth";
import { getOrderForCheckout, activeProviderLabel } from "@/server/orders";
import { formatMoney } from "@/lib/money";
import { timeAgo } from "@/lib/time";
import { CheckoutForm } from "@/components/orders/CheckoutForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Checkout" };

export default async function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const uid = await getSessionUserId();
  if (!uid) redirect(`/login?next=/checkout/${(await params).id}`);

  const { id } = await params;
  const order = await getOrderForCheckout(id, uid);
  if (!order) notFound();

  const showPay = order.status === "PENDING";

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/orders"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-gold"
      >
        <ArrowLeft size={15} /> Back to orders
      </Link>

      <h1 className="font-display text-2xl font-extrabold text-white sm:text-3xl">Checkout</h1>
      <p className="mt-1 text-sm text-white/45">Complete payment for the lot you won.</p>

      <div className="mt-8 grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <div>
          {showPay ? (
            <CheckoutForm order={order} providerLabel={activeProviderLabel()} />
          ) : (
            <div className="panel flex flex-col items-center gap-3 p-10 text-center">
              {order.status === "PAID" ? (
                <Package size={36} className="text-mint" />
              ) : (
                <Clock3 size={36} className="text-white/30" />
              )}
              <h2 className="font-display text-xl font-extrabold text-white">
                {order.status === "PAID" ? "Order paid" : "Order cancelled"}
              </h2>
              <p className="max-w-sm text-sm text-white/50">
                {order.status === "PAID"
                  ? "Payment received. The seller has been notified and will arrange delivery."
                  : "This order is no longer active. If you want the lot, reach out to the seller."}
              </p>
              <Link href="/orders" className="btn-ghost mt-2">
                Go to orders
              </Link>
            </div>
          )}
        </div>

        <aside className="panel h-fit overflow-hidden p-0">
          <div className="relative aspect-[4/3] bg-ink-800">
            {order.listing.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={order.listing.image} alt={order.listing.title} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-white/15">
                <Package size={40} />
              </div>
            )}
          </div>
          <div className="p-5">
            <div className="label-caps mb-1">{order.listing.categoryName}</div>
            <h3 className="font-display text-lg font-bold leading-snug text-white">{order.listing.title}</h3>
            <div className="mt-4 flex items-end justify-between border-t border-white/[0.06] pt-4">
              <div>
                <div className="label-caps">Total</div>
                <div className="num text-2xl font-extrabold text-gold">{formatMoney(order.amount)}</div>
              </div>
              <div className="text-right text-xs text-white/40">
                <div className="label-caps">Status</div>
                <div className="mt-0.5">
                  {order.status === "PENDING" ? "Waiting for payment" : order.status}
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs text-white/30">
              Ordered {timeAgo(order.createdAt)} · Sold by @{order.listing.seller.handle}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}