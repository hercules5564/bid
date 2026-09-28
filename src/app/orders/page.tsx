import { redirect } from "next/navigation";
import Link from "next/link";
import { Package, Clock3, CheckCheck, ReceiptText, XCircle } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getUserOrders } from "@/server/orders";
import { formatMoney } from "@/lib/money";
import { timeAgo } from "@/lib/time";
import type { OrderItem } from "@/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Orders" };

const statusMeta = {
  PENDING: { label: "Awaiting payment", cls: "border-gold/30 bg-gold/10 text-gold", icon: <Clock3 size={12} /> },
  PAID: { label: "Paid", cls: "border-mint/30 bg-mint/10 text-mint", icon: <CheckCheck size={12} /> },
  CANCELLED: { label: "Cancelled", cls: "text-white/40", icon: <XCircle size={12} /> },
} as const;

function OrderRow({ order }: { order: OrderItem }) {
  const meta = statusMeta[order.status];
  return (
    <Link
      href={`/checkout/${order.id}`}
      className="group flex flex-col gap-4 rounded-2xl border border-white/[0.07] bg-ink-850/70 p-4 transition-all duration-200 hover:border-white/[0.14] sm:flex-row sm:items-center"
    >
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl bg-ink-800 sm:w-36">
        {order.listing.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={order.listing.image} alt={order.listing.title} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center text-white/15">
            <Package size={28} />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="label-caps mb-1">{order.listing.categoryName}</div>
        <h3 className="truncate font-display text-base font-bold text-white group-hover:text-gold">
          {order.listing.title}
        </h3>
        <p className="mt-1 text-xs text-white/40">
          Sold by @{order.listing.seller.handle} · {timeAgo(order.createdAt)}
        </p>
        {order.status === "PAID" && order.shipTo && (
          <p className="mt-1 line-clamp-1 text-xs text-white/35">Deliver to: {order.shipTo}</p>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
        <div className="text-right">
          <div className="label-caps">Amount</div>
          <div className="num text-lg font-bold text-gold">{formatMoney(order.amount)}</div>
        </div>
        <span className={`chip ${meta.cls}`}>
          {meta.icon}
          {meta.label}
        </span>
      </div>
    </Link>
  );
}

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/orders");

  const orders = await getUserOrders(user.id);
  const pending = orders.filter((o) => o.status === "PENDING");
  const rest = orders.filter((o) => o.status !== "PENDING");

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl border border-gold/25 bg-gold/10 text-gold">
          <ReceiptText size={20} />
        </span>
        <div>
          <div className="label-caps">Your orders</div>
          <h1 className="font-display text-2xl font-extrabold text-white sm:text-3xl">Orders & purchases</h1>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="panel-flat grid place-items-center gap-3 px-6 py-16 text-center">
          <Package size={36} className="text-white/15" />
          <p className="font-display text-base font-semibold text-white/80">No orders yet</p>
          <p className="max-w-sm text-sm text-white/45">
            Win an auction or use Buy Now and your purchase will show up here for checkout.
          </p>
          <Link href="/browse" className="btn-gold mt-2">
            Browse the floor
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {pending.length > 0 && (
            <section>
              <div className="label-caps mb-3">Need payment</div>
              <div className="flex flex-col gap-3">
                {pending.map((o) => (
                  <OrderRow key={o.id} order={o} />
                ))}
              </div>
            </section>
          )}

          {rest.length > 0 && (
            <section>
              <div className="label-caps mb-3">History</div>
              <div className="flex flex-col gap-3">
                {rest.map((o) => (
                  <OrderRow key={o.id} order={o} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}