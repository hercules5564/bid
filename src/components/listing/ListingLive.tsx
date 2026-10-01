"use client";
import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Heart, Users, Crown, Radio } from "lucide-react";
import { useRoom, useSocketEvent } from "@/hooks/use-socket";
import { getSocket } from "@/lib/socket-client";
import { SocketEvent, Room } from "@/lib/events";
import { useSession } from "@/components/providers/session";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/cn";
import { DurationBadge, StatusPill } from "@/components/ui/primitives";
import { Countdown } from "@/components/ui/Countdown";
import { Avatar } from "@/components/ui/Avatar";
import { BidBox } from "./BidBox";
import { BidFeed } from "./BidFeed";
import type {
  BidNewPayload,
  TimerPayload,
  ClosedPayload,
} from "@/lib/socket-emit";
import type { BidItem, ListingDetail } from "@/types";

const TERMINAL = new Set(["CLOSED", "SOLD", "UNSOLD"]);
let feedSeq = 0;

export function ListingLive({ detail, sellerId }: { detail: ListingDetail; sellerId: string }) {
  const user = useSession();
  const [price, setPrice] = useState(detail.currentPrice);
  const [minNext, setMinNext] = useState(detail.minNextBid);
  const [bidCount, setBidCount] = useState(detail.bidCount);
  const [endsAt, setEndsAt] = useState(detail.endsAt);
  const [status, setStatus] = useState<string>(detail.status);
  const [bids, setBids] = useState<BidItem[]>(detail.bids);
  const [watchers, setWatchers] = useState(0);
  const [watching, setWatching] = useState(detail.watching);
  const [winner, setWinner] = useState(detail.winner);
  const [timeUp, setTimeUp] = useState(false);

  useRoom(SocketEvent.JoinListing, SocketEvent.LeaveListing, detail.id);

  useSocketEvent<BidNewPayload>(SocketEvent.BidNew, (p) => {
    if (p.listingId !== detail.id) return;
    setPrice(p.currentPrice);
    setMinNext(p.minNextBid);
    setBidCount(p.bidCount);
    setBids((cur) => [
      {
        id: `live-${++feedSeq}`,
        amount: p.amount,
        createdAt: p.createdAt,
        isWinning: true,
        bidder: { id: p.bidder.id, handle: p.bidder.handle, name: p.bidder.handle, avatar: p.bidder.avatar },
      },
      ...cur.map((b) => ({ ...b, isWinning: false })),
    ]);
  });

  useSocketEvent<TimerPayload>(SocketEvent.ListingTimer, (p) => {
    if (p.listingId !== detail.id) return;
    setEndsAt(p.endsAt);
    setStatus(p.status);
    setTimeUp(false);
  });

  useSocketEvent<ClosedPayload>(SocketEvent.ListingClosed, (p) => {
    if (p.listingId !== detail.id) return;
    setStatus(p.status);
    setPrice(p.finalPrice);
    setWinner(p.winner ? { ...p.winner, name: p.winner.handle } : null);
  });

  useSocketEvent<{ room: string; count: number }>(SocketEvent.Presence, (p) => {
    if (p.room === Room.listing(detail.id)) setWatchers(p.count);
  });

  // On reconnect, pull a fresh snapshot to heal any events missed while offline.
  useEffect(() => {
    const s = getSocket();
    const resync = () => {
      fetch(`/api/listings/${detail.id}/state`)
        .then((r) => r.json())
        .then((d) => {
          if (!d.ok) return;
          setPrice(d.currentPrice);
          setMinNext(d.minNextBid);
          setBidCount(d.bidCount);
          setEndsAt(d.endsAt);
          setStatus(d.status);
          if (d.winner) setWinner({ ...d.winner });
        })
        .catch(() => {});
    };
    s.on("connect", resync);
    return () => {
      s.off("connect", resync);
    };
  }, [detail.id]);

  const closed = TERMINAL.has(status);
  const isOwn = user?.id === sellerId;

  const toggleWatch = useCallback(async () => {
    if (!user) {
      window.location.href = "/login";
      return;
    }
    setWatching((w) => !w);
    const res = await fetch(`/api/listings/${detail.id}/watch`, { method: "POST" }).then((r) => r.json());
    if (typeof res.watching === "boolean") setWatching(res.watching);
  }, [user, detail.id]);

  return (
    <div className="flex flex-col gap-4">
      <div className="panel p-5">
        <div className="flex flex-wrap items-center gap-2">
          <DurationBadge type={detail.durationType} />
          <StatusPill status={closed ? status : timeUp ? "ENDING_SOON" : status} />
          <span className="chip text-[#1a1408]/50">
            <Users size={12} /> {watchers > 0 ? watchers : detail.activeBidders} {watchers > 0 ? "watching" : "bidders"}
          </span>
        </div>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="label-caps">{closed ? "Final price" : "Current bid"}</div>
            <AnimatePresence mode="popLayout">
              <motion.div
                key={price}
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12, position: "absolute" }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="num whitespace-nowrap py-0.5 pl-0.5 pr-2 text-[1.65rem] font-extrabold leading-[1.15] text-gold-deep sm:text-4xl"
              >
                {formatMoney(price)}
              </motion.div>
            </AnimatePresence>
            <div className="num mt-1 text-xs font-medium text-[#1a1408]/55">{bidCount} bids placed</div>
          </div>
          <div className="text-right">
            <div className="label-caps">{closed ? "Ended" : "Time left"}</div>
            {closed ? (
              <div className="num text-lg text-[#1a1408]/50">Closed</div>
            ) : (
              <Countdown endsAt={endsAt} size="lg" urgentUnder={60} onEnd={() => setTimeUp(true)} />
            )}
          </div>
        </div>

        {closed && winner && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-gold/25 bg-gold/[0.06] p-3">
            <Avatar src={winner.avatar} name={winner.name} size="md" ring />
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gold">
                <Crown size={13} /> Winner
              </div>
              <div className="text-sm font-semibold text-[#1a1408]">@{winner.handle}</div>
            </div>
          </div>
        )}

        <div className="mt-4">
          <BidBox
            listingId={detail.id}
            minNextBid={minNext}
            bidIncrement={detail.bidIncrement}
            buyNowPrice={detail.buyNowPrice}
            disabled={closed || timeUp}
            isOwn={isOwn}
          />
        </div>

        <button
          onClick={toggleWatch}
          className={cn(
            "btn mt-3 w-full border",
            watching
              ? "border-ember/30 bg-ember/10 text-ember"
              : "border-[#3c2d0f]/15 bg-[#3c2d0f]/[0.05] text-[#1a1408]/70 hover:bg-white/[0.06]"
          )}
        >
          <Heart size={15} className={watching ? "fill-current" : ""} />
          {watching ? "Watching" : "Watch this lot"}
        </button>
      </div>

      <div className="panel p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-display text-sm font-bold text-[#1a1408]">
            <Radio size={15} className="text-mint" /> Live bid feed
          </h3>
          <span className="flex items-center gap-1 text-xs text-[#1a1408]/35">
            <Eye size={12} /> updating live
          </span>
        </div>
        <BidFeed bids={bids} currentUserId={user?.id} />
      </div>
    </div>
  );
}
