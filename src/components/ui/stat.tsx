import { cn } from "@/lib/cn";

export function StatCard({
  label,
  value,
  sub,
  icon,
  tone = "default",
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: "default" | "gold" | "arc" | "mint" | "ember";
  className?: string;
}) {
  const toneText = {
    default: "text-white",
    gold: "text-gold",
    arc: "text-arc-soft",
    mint: "text-mint",
    ember: "text-ember",
  }[tone];

  return (
    <div className={cn("panel-flat p-4", className)}>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="label-caps">{label}</span>
        {icon && <span className="text-white/30">{icon}</span>}
      </div>
      <div className={cn("num text-2xl font-extrabold", toneText)}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-white/40">{sub}</div>}
    </div>
  );
}
