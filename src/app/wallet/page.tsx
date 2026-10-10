import Link from "next/link";
import { getSessionUserId } from "@/lib/auth";
import { getWalletState } from "@/server/wallet";
import { escrowConfig } from "@/lib/config";
import { razorpayEnabled } from "@/server/razorpay";
import { formatMoney } from "@/lib/money";
import { DualMoney } from "@/components/money/DualMoney";
import { TopUpForm } from "@/components/wallet/TopUpForm";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  TOPUP: "Top-up",
  BONUS: "Welcome bonus",
  HOLD: "Bid hold",
  HOLD_INCREASE: "Hold increased",
  RELEASE: "Hold released",
  CAPTURE: "Win — deducted",
  REFUND: "Refund",
};

export default async function WalletPage() {
  const uid = await getSessionUserId();
  if (!uid) {
    return (
      <div className="panel mx-auto max-w-md p-6 text-center">
        <p className="text-sm text-[#1a1408]/60">Sign in to view your wallet.</p>
        <Link href="/login" className="btn-gold mt-3 w-full">
          Sign in
        </Link>
      </div>
    );
  }

  const wallet = await getWalletState(uid);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <p className="label-caps">Prepaid bidding balance</p>
        <h1 className="font-display text-3xl font-bold">Wallet</h1>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="panel p-4">
          <p className="label-caps">Balance</p>
          <p className="num mt-1 text-xl font-bold sm:text-2xl"><DualMoney paise={wallet.balance} layout="sub" primary="usdt" /></p>
        </div>
        <div className="panel p-4">
          <p className="label-caps">Held in bids</p>
          <p className="num mt-1 text-xl font-bold text-arc sm:text-2xl"><DualMoney paise={wallet.held} layout="sub" primary="usdt" /></p>
        </div>
        <div className="panel border-gold/40 p-4 shadow-glow-gold">
          <p className="label-caps">Available</p>
          <p className="num mt-1 text-xl font-bold text-gold-deep sm:text-2xl"><DualMoney paise={wallet.available} layout="sub" primary="usdt" /></p>
        </div>
      </div>

      <div className="panel-flat p-4 text-sm leading-relaxed text-[#1a1408]/70">
        <strong className="text-[#1a1408]">How it works:</strong> every bid locks that amount from your
        wallet. Get outbid and it&apos;s released instantly; win and it&apos;s deducted automatically —
        no checkout, no unpaid winners.
      </div>

      <TopUpForm escrowAddress={escrowConfig.usdtAddress} network={escrowConfig.network} card={razorpayEnabled()} />

      <div className="panel p-5">
        <h2 className="text-base font-bold">Recent activity</h2>
        {wallet.txns.length === 0 ? (
          <p className="mt-2 text-sm text-[#1a1408]/50">No wallet activity yet — top up to get started.</p>
        ) : (
          <ul className="mt-2 divide-y divide-[#3c2d0f]/10">
            {wallet.txns.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{TYPE_LABEL[t.type] ?? t.type}</p>
                  <p className="truncate text-xs text-[#1a1408]/50">
                    {t.note ?? ""} · {new Date(t.createdAt).toLocaleString("en-IN")}
                  </p>
                </div>
                <p className="num shrink-0 text-sm font-bold"><DualMoney paise={t.amount} short primary="usdt" /></p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
