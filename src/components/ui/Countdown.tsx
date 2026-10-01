"use client";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { formatCountdown, msLeft } from "@/lib/time";

const sizeClass = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-2xl",
  xl: "text-4xl sm:text-5xl",
};

export function Countdown({
  endsAt,
  className,
  size = "md",
  urgentUnder = 300,
  onEnd,
  prefix,
}: {
  endsAt: string;
  className?: string;
  size?: keyof typeof sizeClass;
  urgentUnder?: number;
  onEnd?: () => void;
  prefix?: React.ReactNode;
}) {
  const [now, setNow] = useState(() => Date.now());
  const ended = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const ms = msLeft(endsAt, now);
  const urgent = ms > 0 && ms <= urgentUnder * 1000;

  useEffect(() => {
    if (ms <= 0 && !ended.current) {
      ended.current = true;
      onEnd?.();
    }
    if (ms > 0) ended.current = false;
  }, [ms, onEnd]);

  if (ms <= 0) {
    return <span className={cn("num text-[#1a1408]/40", sizeClass[size], className)}>Ended</span>;
  }

  return (
    <span
      className={cn(
        "num font-semibold tabular-nums",
        sizeClass[size],
        urgent ? "text-ember" : "text-[#1a1408]",
        urgent && "animate-pulse",
        className
      )}
    >
      {prefix}
      {formatCountdown(ms)}
    </span>
  );
}
