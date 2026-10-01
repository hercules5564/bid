import Link from "next/link";
import { cn } from "@/lib/cn";
import { formatMoney, formatMoneyShort } from "@/lib/money";
import type { ListingSummary } from "@/types";
import { DurationBadge, StatusPill } from "@/components/ui/primitives";
import { CategoryIcon } from "@/components/ui/CategoryIcon";
import { Countdown } from "@/components/ui/Countdown";
import { Gavel } from "lucide-react";

export function ListingCard({ listing: l, className }: { listing: ListingSummary; className?: string }) {
  const closed = l.status === "CLOSED" || l.status === "SOLD" || l.status === "UNSOLD";
  return (
    <Link
      href={`/listing/${l.id}`}
      className={cn(
        "group relative block overflow-hidden rounded-2xl border border-[#3c2d0f]/10 bg-cream transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-gold/50 hover:shadow-glow-gold",
        className
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-sand">
        {l.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={l.image}
            alt={l.title}
            loading="lazy"
            className={cn(
              "h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]",
              closed && "opacity-50 grayscale"
            )}
          />
        ) : (
          <div className="grid h-full place-items-center text-[#1a1408]/20">
            <Gavel size={40} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1408]/40 via-transparent to-transparent" />

        <div className="absolute left-3 top-3">
          <DurationBadge type={l.durationType} />
        </div>
        <div className="absolute right-3 top-3">
          <StatusPill status={l.status} />
        </div>
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-xs font-medium text-white drop-shadow">
          <CategoryIcon icon={l.category.icon} size={13} />
          {l.category.name}
        </div>
      </div>

      <div className="p-4">
        <h3 className="line-clamp-2 min-h-[2.5rem] font-display text-[0.95rem] font-semibold leading-snug text-[#1a1408]">
          {l.title}
        </h3>

        <div className="mt-3 flex items-end justify-between gap-2">
          <div>
            <div className="label-caps">Current bid</div>
            <div className="num text-lg font-bold text-[#b8860b]">{formatMoney(l.currentPrice)}</div>
          </div>
          <div className="text-right">
            <div className="label-caps">{closed ? "Result" : "Ends in"}</div>
            {closed ? (
              <div className="num text-sm text-[#1a1408]/55">{l.status === "SOLD" ? "Sold" : "Closed"}</div>
            ) : (
              <Countdown endsAt={l.endsAt} size="sm" urgentUnder={300} />
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-[#3c2d0f]/10 pt-3 text-xs text-[#1a1408]/55">
          <span className="num">{l.bidCount} bids</span>
          <span>
            min next <span className="num text-[#1a1408]/75">{formatMoneyShort(l.minNextBid)}</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
