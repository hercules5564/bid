"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Crown } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { formatMoney } from "@/lib/money";
import { timeAgo } from "@/lib/time";
import { cn } from "@/lib/cn";
import type { BidItem } from "@/types";

export function BidFeed({ bids, currentUserId }: { bids: BidItem[]; currentUserId?: string | null }) {
  if (bids.length === 0) {
    return (
      <div className="grid place-items-center py-10 text-center text-sm text-[#1a1408]/35">
        No bids yet — be the one to open the floor.
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-1.5">
      <AnimatePresence initial={false}>
        {bids.slice(0, 25).map((b, i) => {
          const mine = b.bidder.id === currentUserId;
          return (
            <motion.li
              key={b.id}
              layout
              initial={{ opacity: 0, y: -10, backgroundColor: "rgba(232,179,74,0.16)" }}
              animate={{ opacity: 1, y: 0, backgroundColor: "rgba(255,255,255,0)" }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, backgroundColor: { duration: 1.1 } }}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2",
                i === 0 && b.isWinning ? "border border-gold/25" : "border border-transparent"
              )}
            >
              <Avatar src={b.bidder.avatar} name={b.bidder.handle} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-semibold text-[#1a1408]/90">
                    {mine ? "You" : `@${b.bidder.handle}`}
                  </span>
                  {i === 0 && b.isWinning && (
                    <span className="inline-flex items-center gap-0.5 text-[0.62rem] font-bold uppercase tracking-wide text-gold">
                      <Crown size={11} /> Top
                    </span>
                  )}
                </div>
                <span className="text-[0.68rem] text-[#1a1408]/35 num">{timeAgo(b.createdAt)}</span>
              </div>
              <span className={cn("num text-sm font-bold", i === 0 ? "text-gold" : "text-[#1a1408]/70")}>
                {formatMoney(b.amount)}
              </span>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}
