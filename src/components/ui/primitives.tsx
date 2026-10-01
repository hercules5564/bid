import { Zap, Clock3, CalendarDays, Swords } from "lucide-react";
import { cn } from "@/lib/cn";
import { DURATION_META, type DurationType } from "@/lib/time";

export function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cn("relative flex h-2 w-2", className)}>
      <span className="absolute inline-flex h-full w-full animate-live-pulse rounded-full bg-mint opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-mint" />
    </span>
  );
}

const durationTone: Record<string, string> = {
  ember: "text-ember border-ember/30 bg-ember/10",
  arc: "text-arc-soft border-arc/30 bg-arc/10",
  gold: "text-gold border-gold/30 bg-gold/10",
};
const durationIcon: Record<DurationType, React.ReactNode> = {
  HOURLY: <Zap size={12} className="fill-current" />,
  DAILY: <Clock3 size={12} />,
  WEEKLY: <CalendarDays size={12} />,
  WEEKLY_SHOWDOWN: <Swords size={12} />,
};

export function DurationBadge({ type, className }: { type: DurationType; className?: string }) {
  const meta = DURATION_META[type];
  return (
    <span className={cn("chip", durationTone[meta.tone], className)}>
      {durationIcon[type]}
      {meta.short}
    </span>
  );
}

export function StatusPill({ status }: { status: string }) {
  if (status === "LIVE")
    return (
      <span className="chip border-mint/30 bg-mint/10 text-mint">
        <LiveDot /> LIVE
      </span>
    );
  if (status === "ENDING_SOON")
    return <span className="chip animate-pulse border-ember/40 bg-ember/10 text-ember">ENDING SOON</span>;
  if (status === "SOLD") return <span className="chip border-gold/30 bg-gold/10 text-gold">SOLD</span>;
  if (status === "UNSOLD") return <span className="chip text-[#1a1408]/40">UNSOLD</span>;
  if (status === "SCHEDULED") return <span className="chip text-[#1a1408]/50">SCHEDULED</span>;
  return <span className="chip text-[#1a1408]/40">CLOSED</span>;
}

const medalColor = ["", "text-medal-gold", "text-medal-silver", "text-medal-bronze"];

export function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) {
    return (
      <span
        className={cn(
          "grid h-9 w-9 place-items-center rounded-xl border text-sm font-bold num",
          rank === 1 && "border-medal-gold/40 bg-medal-gold/10 text-medal-gold",
          rank === 2 && "border-medal-silver/30 bg-medal-silver/10 text-medal-silver",
          rank === 3 && "border-medal-bronze/30 bg-medal-bronze/10 text-medal-bronze"
        )}
      >
        {rank}
      </span>
    );
  }
  return (
    <span className="grid h-9 w-9 place-items-center rounded-xl border border-[#3c2d0f]/10 bg-[#3c2d0f]/[0.05] text-sm font-semibold num text-[#1a1408]/45">
      {rank}
    </span>
  );
}

export function medalTextColor(rank: number) {
  return medalColor[rank] ?? "text-[#1a1408]/60";
}

export function Sparkline() {
  return null;
}
