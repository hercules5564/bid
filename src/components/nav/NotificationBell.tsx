"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, CheckCheck, Trophy, Zap, Gavel, Swords, Clock3 } from "lucide-react";
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
};

export function NotificationBell() {
  const { items, unread, markAll, markOne } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-white/70 transition-colors hover:bg-white/[0.07] hover:text-white"
        aria-label="Notifications"
      >
        <Bell size={17} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid min-w-[18px] place-items-center rounded-full bg-ember px-1 text-[0.62rem] font-bold text-white num">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="panel absolute right-0 z-50 mt-2 max-h-[70vh] w-80 overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
              <span className="font-display text-sm font-bold text-white">Notifications</span>
              {unread > 0 && (
                <button
                  onClick={markAll}
                  className="inline-flex items-center gap-1 text-xs text-white/45 transition-colors hover:text-gold"
                >
                  <CheckCheck size={13} /> Mark all read
                </button>
              )}
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-white/35">You're all caught up.</p>
              ) : (
                items.map((n) => {
                  const inner = (
                    <>
                      <span className="mt-0.5 shrink-0">{icon[n.type] ?? <Bell size={15} />}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-white/90">{n.title}</span>
                          <span className="shrink-0 text-[0.65rem] text-white/30 num">{timeAgo(n.createdAt)}</span>
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
                    <Link key={n.id} href={`/listing/${n.listingId}`} className={cls} onClick={() => { markOne(n.id); setOpen(false); }}>
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
