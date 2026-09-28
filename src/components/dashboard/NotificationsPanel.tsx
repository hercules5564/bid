"use client";
import Link from "next/link";
import { Bell, CheckCheck, Trophy, Zap, Gavel, Swords, Clock3, ReceiptText, XCircle } from "lucide-react";
import { useNotifications } from "@/components/providers/notifications";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/cn";

const icon: Record<string, React.ReactNode> = {
  OUTBID: <Zap size={15} className="text-ember" />,
  WON: <Trophy size={15} className="text-gold" />,
  LOST: <Gavel size={15} className="text-white/40" />,
  ENDING_SOON: <Clock3 size={15} className="text-ember" />,
  SHOWDOWN_STARTING: <Swords size={15} className="text-gold" />,
  BID_PLACED: <Gavel size={15} className="text-mint" />,
  ORDER_PAID: <ReceiptText size={15} className="text-mint" />,
  ORDER_CANCELLED: <XCircle size={15} className="text-white/40" />,
};

export function NotificationsPanel() {
  const { items, unread, markAll, markOne } = useNotifications();

  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-2">
          <Bell size={15} className="text-gold" />
          <span className="font-display text-sm font-bold text-white">Notifications</span>
          {unread > 0 && (
            <span className="num rounded-full bg-ember px-1.5 text-[0.6rem] font-bold text-white">{unread}</span>
          )}
        </div>
        {unread > 0 && (
          <button onClick={markAll} className="inline-flex items-center gap-1 text-xs text-white/45 hover:text-gold">
            <CheckCheck size={13} /> Mark all
          </button>
        )}
      </div>
      <div className="max-h-[560px] overflow-y-auto">
        {items.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-white/35">Nothing yet. Place a bid to get going.</p>
        ) : (
          items.map((n) => {
            const inner = (
              <>
                <span className="mt-0.5 shrink-0">{icon[n.type] ?? <Bell size={15} />}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-white/90">{n.title}</span>
                    <span className="num shrink-0 text-[0.65rem] text-white/30">{timeAgo(n.createdAt)}</span>
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-xs leading-snug text-white/50">{n.body}</span>
                </span>
                {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" />}
              </>
            );
            const cls = cn(
              "flex gap-3 border-b border-white/[0.04] px-4 py-3 text-left transition-colors hover:bg-white/[0.03]",
              !n.read && "bg-gold/[0.03]"
            );
            return n.listingId ? (
              <Link key={n.id} href={`/listing/${n.listingId}`} className={cls} onClick={() => markOne(n.id)}>
                {inner}
              </Link>
            ) : (
              <button key={n.id} className={cls + " w-full"} onClick={() => markOne(n.id)}>
                {inner}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
