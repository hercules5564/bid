import { redirect } from "next/navigation";
import Link from "next/link";
import { Gavel, Trophy, Coins, Flame, Crown, Eye, TrendingUp, ReceiptText, ArrowRight } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getUserDashboard } from "@/server/dashboard";
import { formatMoney } from "@/lib/money";
import { StatCard } from "@/components/ui/stat";
import { CardGrid } from "@/components/listing/CardRail";
import { SectionHeader, EmptyState } from "@/components/ui/section";
import { Avatar } from "@/components/ui/Avatar";
import { NotificationsPanel } from "@/components/dashboard/NotificationsPanel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");

  const { activeBids, watchlist, won, pendingOrders } = await getUserDashboard(user.id);
  const leading = activeBids.filter((l) => l.leading);
  const trailing = activeBids.filter((l) => !l.leading);

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Avatar src={user.avatar} name={user.name} size="lg" ring />
        <div>
          <div className="label-caps">Your dashboard</div>
          <h1 className="font-display text-2xl font-extrabold text-[#1a1408] sm:text-3xl">{user.name}</h1>
          <p className="text-sm text-[#1a1408]/45">@{user.handle}</p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total bids" value={user.totalBids} icon={<Gavel size={15} />} />
        <StatCard label="Auctions won" value={user.auctionsWon} tone="gold" icon={<Trophy size={15} />} />
        <StatCard label="Won value" value={formatMoney(user.totalWonValue)} tone="gold" icon={<Coins size={15} />} />
        <StatCard label="Highest bid" value={formatMoney(user.highestSingleBid)} tone="arc" icon={<TrendingUp size={15} />} />
      </div>

      {pendingOrders.length > 0 && (
        <section className="mb-10">
          <SectionHeader
            title="Awaiting payment"
            kicker={`${pendingOrders.length} order${pendingOrders.length === 1 ? "" : "s"} need checkout`}
            icon={<ReceiptText size={13} className="text-ember" />}
            href="/orders"
            hrefLabel="All orders"
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pendingOrders.map((o) => (
              <Link
                key={o.id}
                href={`/checkout/${o.id}`}
                className="group flex items-center gap-4 rounded-2xl border border-ember/20 bg-white/70 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-ember/40"
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-sand">
                  {o.listing.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={o.listing.image} alt={o.listing.title} className="h-full w-full object-cover" />
                  ) : (
                    <Gavel size={22} className="mx-auto mt-5 text-[#1a1408]/20" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-display text-sm font-bold text-[#1a1408] group-hover:text-gold">
                    {o.listing.title}
                  </h3>
                  <p className="num mt-0.5 text-sm font-semibold text-ember">{formatMoney(o.amount)}</p>
                </div>
                <ArrowRight size={16} className="shrink-0 text-[#1a1408]/30 transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-8">
          <section>
            <SectionHeader
              title="Where you're leading"
              kicker="Active · winning"
              icon={<Crown size={13} className="text-gold" />}
            />
            {leading.length ? (
              <CardGrid items={leading} />
            ) : (
              <EmptyState title="You're not leading any lots" body="Place a bid and grab the top spot." />
            )}
          </section>

          {trailing.length > 0 && (
            <section>
              <SectionHeader title="Outbid — jump back in" kicker="Active · trailing" icon={<Flame size={13} className="text-ember" />} />
              <CardGrid items={trailing} />
            </section>
          )}

          <section>
            <SectionHeader title="Watchlist" kicker="Following" icon={<Eye size={13} />} />
            {watchlist.length ? (
              <CardGrid items={watchlist} />
            ) : (
              <EmptyState title="Nothing on your watchlist" body="Tap ‘Watch this lot’ on any auction to track it here." />
            )}
          </section>

          <section>
            <SectionHeader title="Auctions won" kicker="Your wins" icon={<Trophy size={13} className="text-gold" />} />
            {won.length ? (
              <CardGrid items={won} />
            ) : (
              <EmptyState title="No wins yet" body="Your trophies will show up here." />
            )}
          </section>
        </div>

        <div className="self-start lg:sticky lg:top-24">
          <NotificationsPanel />
        </div>
      </div>
    </div>
  );
}
