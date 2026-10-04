"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Wallet } from "lucide-react";
import { useSession } from "@/components/providers/session";
import { formatMoney } from "@/lib/money";
import { getInrPerUsdt, usdtString } from "@/lib/usdt";

export function WalletChip() {
  const user = useSession();
  const [available, setAvailable] = useState<number | null>(null);
  const [rate, setRate] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      setAvailable(null);
      return;
    }
    let live = true;
    fetch("/api/wallet")
      .then((r) => r.json())
      .then((d) => {
        if (live && d.ok) setAvailable(d.wallet.available as number);
      })
      .catch(() => {});
    getInrPerUsdt().then((r) => {
      if (live) setRate(r);
    });
    return () => {
      live = false;
    };
  }, [user]);

  if (!user) return null;
  const label = available === null || rate === null ? "…" : `${usdtString(available, rate)} USDT`;

  return (
    <Link
      href="/wallet"
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#e8b34a]/40 px-3 py-2 text-sm font-semibold text-[#e8b34a] transition-colors duration-200 hover:bg-[#e8b34a]/10"
      title={available === null ? "Wallet — top up to bid" : `${formatMoney(available)} available`}
    >
      <Wallet size={15} />
      <span className="num">{label}</span>
    </Link>
  );
}
