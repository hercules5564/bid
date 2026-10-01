import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";

export function SectionHeader({
  title,
  kicker,
  icon,
  href,
  hrefLabel = "View all",
  className,
}: {
  title: string;
  kicker?: string;
  icon?: React.ReactNode;
  href?: string;
  hrefLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-end justify-between gap-4", className)}>
      <div>
        {kicker && (
          <div className="label-caps mb-1 flex items-center gap-1.5">
            {icon}
            {kicker}
          </div>
        )}
        <h2 className="font-display text-xl font-bold tracking-tight text-[#1a1408] sm:text-2xl">{title}</h2>
      </div>
      {href && (
        <Link
          href={href}
          className="group inline-flex shrink-0 items-center gap-1 text-sm font-medium text-[#1a1408]/50 transition-colors hover:text-gold"
        >
          {hrefLabel}
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="panel-flat grid place-items-center gap-2 px-6 py-14 text-center">
      {icon && <div className="mb-1 text-[#1a1408]/20">{icon}</div>}
      <p className="font-display text-base font-semibold text-[#1a1408]/80">{title}</p>
      {body && <p className="max-w-sm text-sm text-[#1a1408]/45">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
