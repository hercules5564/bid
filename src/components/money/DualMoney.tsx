"use client";
import { useEffect, useState } from "react";
import { formatMoney, formatMoneyShort } from "@/lib/money";
import { getInrPerUsdt, usdtString } from "@/lib/usdt";
import { cn } from "@/lib/cn";

/**
 * Dual-currency amount: ₹ figure with a muted "≈ X USDT" alongside.
 * layout="inline" → "₹1,000 · ≈11.11 USDT" · layout="sub" → USDT on its own line.
 * primary="usdt" flips it: USDT first, "≈ ₹…" second (wallet screens).
 */
export function DualMoney({
  paise,
  short = false,
  layout = "inline",
  primary = "inr",
  className,
  usdtClassName,
}: {
  paise: number;
  short?: boolean;
  layout?: "inline" | "sub";
  primary?: "inr" | "usdt";
  className?: string;
  usdtClassName?: string;
}) {
  const [usdt, setUsdt] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    getInrPerUsdt().then((rate) => {
      if (live) setUsdt(usdtString(paise, rate));
    });
    return () => {
      live = false;
    };
  }, [paise]);

  const inr = short ? formatMoneyShort(paise) : formatMoney(paise);
  if (usdt === null || usdt === "") return <span className={className}>{inr}</span>;

  if (primary === "usdt") {
    const big = `${usdt} USDT`;
    if (layout === "sub") {
      return (
        <span className={className}>
          <span className="block">{big}</span>
          <span className={cn("num block text-xs font-medium opacity-60", usdtClassName)}>≈ {inr}</span>
        </span>
      );
    }
    return (
      <span className={className}>
        {big} <span className={cn("opacity-60", usdtClassName)}>· ≈ {inr}</span>
      </span>
    );
  }

  if (layout === "sub") {
    return (
      <span className={className}>
        <span className="block">{inr}</span>
        <span className={cn("num block text-xs font-medium opacity-60", usdtClassName)}>≈ {usdt} USDT</span>
      </span>
    );
  }
  return (
    <span className={className}>
      {inr} <span className={cn("opacity-60", usdtClassName)}>· ≈ {usdt} USDT</span>
    </span>
  );
}
