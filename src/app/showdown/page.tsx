import Link from "next/link";
import { Swords, Users, Flame, Crown, Gavel } from "lucide-react";
import { getSessionUserId } from "@/lib/auth";
import { getActiveShowdownId, getShowdownChampions } from "@/server/showdown";
import { getListingDetail } from "@/server/listings";
import { formatMoney } from "@/lib/money";
import { Gallery } from "@/components/listing/Gallery";
import { ListingLive } from "@/components/listing/ListingLive";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/section";

export const dynamic = "force-dynamic";
export const metadata = { title: "Weekly Showdown" };

export default async function ShowdownPage() {
  const [uid, showdownId, champions] = await Promise.all([
    getSessionUserId(),
    getActiveShowdownId(),
    getShowdownChampions(),
  ]);

  if (!showdownId) {
    return (
      <div className="mx-auto max-w-3xl py-10">
        <EmptyState
          icon={<Swords size={40} />}
          title="No Showdown live right now"
          body="The next headline lot is staged every Sunday at 8 PM. Meanwhile, the floor never sleeps."
          action={
            <Link href="/browse" className="btn-gold">
              <Gavel size={16} /> Browse live lots
            </Link>
          }
        />
        {champions.length > 0 && <ChampionsStrip champions={champions} />}
      </div>
    );
  }

  const detail = await getListingDetail(showdownId, uid);
  if (!detail) return null;

  return (
    <div className="flex flex-col gap-8">
      <section className="panel relative overflow-hidden">
        <div className="absolute inset-0">
          {detail.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={detail.image} alt="" className="h-full w-full object-cover opacity-20 blur-sm" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-ink-950/70 via-ink-950/85 to-ink-950" />
        </div>
        <div className="relative flex flex-col items-center px-6 py-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-gold">
            <Swords size={13} /> Weekly Showdown
          </div>
          <h1 className="mt-4 max-w-3xl font-display text-3xl font-extrabold leading-tight text-[#faf6ec] sm:text-5xl">
            {detail.title}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/60">
            The most valuable lot on Gavl this week. Every bidder, one arena.
          </p>
          <div className="mt-6 flex items-center gap-6">
            <div>
              <div className="label-caps">Top bid</div>
              <div className="num text-2xl font-extrabold text-gold sm:text-3xl">{formatMoney(detail.currentPrice)}</div>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div className="flex items-center gap-2 text-sm font-medium text-white/60">
              <Users size={15} /> {detail.activeBidders} bidders
            </div>
            <div className="flex items-center gap-2 text-sm font-medium text-white/60">
              <Flame size={15} className="text-ember" /> {detail.bidCount} bids
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <div className="flex flex-col gap-6">
          <Gallery images={detail.images} title={detail.title} />
          <p className="whitespace-pre-line text-[0.95rem] leading-relaxed text-[#1a1408]/65">{detail.description}</p>
        </div>
        <div className="lg:sticky lg:top-24 lg:self-start">
          <ListingLive detail={detail} sellerId={detail.seller.id} />
        </div>
      </div>

      {champions.length > 0 && <ChampionsStrip champions={champions} />}
    </div>
  );
}

function ChampionsStrip({
  champions,
}: {
  champions: Awaited<ReturnType<typeof getShowdownChampions>>;
}) {
  return (
    <section className="mt-4">
      <div className="mb-4 flex items-center gap-2">
        <Crown size={16} className="text-gold" />
        <h2 className="font-display text-lg font-bold text-[#1a1408]">Past Showdown champions</h2>
      </div>
      <div className="rail -mx-1 px-1">
        {champions.map((c) => (
          <Link
            key={c.listingId}
            href={`/listing/${c.listingId}`}
            className="w-[220px] shrink-0 snap-start overflow-hidden rounded-2xl border border-[#3c2d0f]/15 bg-white/70"
          >
            <div className="relative aspect-[16/10] bg-sand">
              {c.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.image} alt={c.title} className="h-full w-full object-cover opacity-80" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-ink-950 to-transparent" />
            </div>
            <div className="p-3">
              <div className="truncate text-sm font-semibold text-[#1a1408]">{c.title}</div>
              {c.winner && (
                <div className="mt-2 flex items-center gap-2">
                  <Avatar src={c.winner.avatar} name={c.winner.name} size="xs" />
                  <span className="text-xs text-[#1a1408]/55">@{c.winner.handle}</span>
                  <span className="num ml-auto text-xs font-bold text-gold">{formatMoney(c.finalPrice)}</span>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
