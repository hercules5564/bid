import { Star } from "lucide-react";
import { cn } from "@/lib/cn";

/** Read-only star display, e.g. ★★★★☆ + "4.2 (13)". */
export function Stars({ value, className, size = 14 }: { value: number; className?: string; size?: number }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={size}
          className={i < Math.round(value) ? "fill-gold text-gold" : "text-[#1a1408]/20"}
        />
      ))}
    </span>
  );
}

/** Interactive star picker for the review form. */
export function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <span className="inline-flex items-center gap-1" role="radiogroup" aria-label="Your rating">
      {Array.from({ length: 5 }).map((_, i) => {
        const v = i + 1;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={value === v}
            aria-label={`${v} star${v > 1 ? "s" : ""}`}
            onClick={() => onChange(v)}
            className="cursor-pointer rounded p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
          >
            <Star size={26} className={v <= value ? "fill-gold text-gold" : "text-[#1a1408]/20"} />
          </button>
        );
      })}
    </span>
  );
}
