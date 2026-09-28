"use client";
import { useState } from "react";
import Link from "next/link";
import { Swords, Users, Flame, ArrowRight, Gavel } from "lucide-react";
import { useRoom, useSocketEvent } from "@/hooks/use-socket";
import { SocketEvent } from "@/lib/events";
import { formatMoney } from "@/lib/money";
import { Countdown } from "@/components/ui/Countdown";
import type { ShowdownPayload, BidNewPayload } from "@/lib/socket-emit";

export type ShowdownHeroData = {
  id: string;
  title: string;
  image: string | null;
  currentPrice: number;
  bidCount: number;
  endsAt: string;
  activeBidders: number;
  categoryName: string;
};

export function ShowdownHero({ data }: { data: ShowdownHeroData }) {
  const [price, setPrice] = useState(data.currentPrice);
  const [bidCount, setBidCount] = useState(data.bidCount);
  const [bidders, setBidders] = useState(data.activeBidders);

  useRoom(SocketEvent.JoinShowdown, SocketEvent.LeaveShowdown);
  useRoom(SocketEvent.JoinListing, SocketEvent.LeaveListing, data.id);

  useSocketEvent<ShowdownPayload>(SocketEvent.ShowdownUpdate, (p) => {
    if (p.listingId !== data.id) return;
    setPrice(p.currentPrice);
    setBidCount(p.bidCount);
    setBidders(p.activeBidders);
  });
  useSocketEvent<BidNewPayload>(SocketEvent.BidNew, (p) => {
    if (p.listingId !== data.id) return;
    setPrice(p.currentPrice);
    setBidCount(p.bidCount);
  });

  return (
    <section className="panel relative overflow-hidden">
      {/* backdrop */}
      <div className="absolute inset-0">
        {data.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.image} alt="" className="h-full w-full object-cover opacity-25 blur-[2px]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/90 to-ink-950/40" />
        <div className="absolute inset-0 bg-grain opacity-40" />
      </div>

      <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.3fr_1fr] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-gold">
            <Swords size={13} /> Weekly Showdown
          </div>
          <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
            {data.title}
          </h1>
          <p className="mt-2 text-sm text-white/50">
            The single most valuable lot on Gavl this week · {data.categoryName}
          </p>

          <div className="mt-6 flex flex-wrap items-end gap-x-8 gap-y-4">
            <div>
              <div className="label-caps">Top bid</div>
              <div className="num text-3xl font-extrabold text-gold sm:text-4xl">{formatMoney(price)}</div>
            </div>
            <div>
              <div className="label-caps">Closes in</div>
              <Countdown endsAt={data.endsAt} size="lg" urgentUnder={600} />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link href="/showdown" className="btn-gold">
              <Gavel size={16} /> Enter the Showdown
            </Link>
            <span className="chip text-white/60">
              <Users size={13} /> {bidders} bidders
            </span>
            <span className="chip text-white/60">
              <Flame size={13} className="text-ember" /> {bidCount} bids
            </span>
          </div>
        </div>

        <Link href="/showdown" className="group relative hidden overflow-hidden rounded-2xl border border-white/10 lg:block">
          <div className="aspect-[4/3] w-full overflow-hidden bg-ink-800">
            {data.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.image}
                alt={data.title}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <div className="grid h-full place-items-center text-white/15">
                <Gavel size={56} />
              </div>
            )}
          </div>
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-ink-950 to-transparent p-4">
            <span className="text-sm font-semibold text-white">View the lot</span>
            <ArrowRight size={16} className="text-gold transition-transform group-hover:translate-x-1" />
          </div>
        </Link>
      </div>
    </section>
  );
}
