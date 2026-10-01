import { CountUp } from "./CountUp";
import { formatMoneyShort } from "@/lib/money";

export function StatsBand({
  liveNow,
  bidsPlaced,
  transacted,
  bidders,
}: {
  liveNow: number;
  bidsPlaced: number;
  transacted: number;
  bidders: number;
}) {
  const stats = [
    { label: "Live lots right now", node: <CountUp value={liveNow} /> },
    { label: "Bids placed", node: <CountUp value={bidsPlaced} compact /> },
    { label: "Value transacted", node: <span className="num">{formatMoneyShort(transacted)}</span> },
    { label: "Active bidders", node: <CountUp value={bidders} /> },
  ];

  return (
    <section className="border-y border-[#3c2d0f]/10 bg-white/[0.015]">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="px-6 py-8 text-center sm:py-10">
            <div className="font-display text-3xl font-extrabold tracking-tight text-[#1a1408] sm:text-4xl">
              {s.node}
            </div>
            <div className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#1a1408]/35">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}