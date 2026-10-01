"use client";
import { useId } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export type SelectOption = { value: string; label: string };

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  ariaLabel: string;
  icon?: React.ReactNode;
  className?: string;
  selectClassName?: string;
  name?: string;
  required?: boolean;
  filledValue?: string;
};

/**
 * Stylish native-select wrapper.
 * Keeps native keyboard / mobile / screen-reader behaviour,
 * but renders a custom gold-accented shell with icon + animated chevron.
 */
export function StyledSelect({
  value,
  onChange,
  options,
  ariaLabel,
  icon,
  className,
  selectClassName,
  name,
  required,
  filledValue = "",
}: Props) {
  const id = useId();
  const filled = value !== filledValue;

  return (
    <div
      className={cn(
        "group relative inline-flex items-center",
        "rounded-xl border bg-white/70 backdrop-blur-sm",
        "transition-all duration-200 cursor-pointer",
        filled
          ? "border-gold/40 shadow-[0_0_0_1px_rgba(232,179,74,0.18),0_8px_20px_-12px_rgba(184,132,42,0.5)]"
          : "border-[#3c2d0f]/15 shadow-[0_1px_0_0_rgba(255,255,255,0.6)_inset]",
        "hover:border-[#3c2d0f]/30 hover:bg-white hover:shadow-[0_8px_24px_-14px_rgba(60,45,15,0.45)]",
        "focus-within:border-gold/60 focus-within:bg-white focus-within:shadow-glow-gold focus-within:ring-2 focus-within:ring-gold/20",
        className
      )}
    >
      {icon && (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute left-3 grid place-items-center transition-colors duration-200",
            filled ? "text-gold-deep" : "text-[#1a1408]/35 group-hover:text-[#1a1408]/60 group-focus-within:text-gold-deep"
          )}
        >
          {icon}
        </span>
      )}

      {filled && (
        <span aria-hidden className="pointer-events-none absolute left-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-gold shadow-[0_0_8px_2px_rgba(232,179,74,0.5)]" />
      )}

      <select
        id={id}
        name={name}
        required={required}
        value={value}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "peer w-full cursor-pointer appearance-none bg-transparent",
          "py-2.5 text-sm font-medium text-[#1a1408]/85",
          "hover:text-[#1a1408]",
          "focus:outline-none",
          icon ? "pl-9" : "pl-3.5",
          "pr-9",
          selectClassName
        )}
      >
        {options.map((o) => (
          <option key={o.value || "_empty"} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <span
        aria-hidden
        className="pointer-events-none absolute right-2.5 grid h-6 w-6 place-items-center rounded-md text-[#1a1408]/40 transition-all duration-200 group-hover:bg-[#3c2d0f]/[0.06] group-hover:text-[#1a1408]/70 peer-focus:text-gold-deep group-focus-within:rotate-180 group-focus-within:text-gold-deep"
      >
        <ChevronDown size={15} strokeWidth={2.5} />
      </span>
    </div>
  );
}
