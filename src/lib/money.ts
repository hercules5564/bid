// All money is integer paise (1 rupee = 100 paise). Format at the edges only.

const inr0 = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatMoney(paise: number): string {
  return inr0.format(Math.round(paise / 100));
}

/** Compact form for dense cards: ₹1.2L, ₹3.4Cr, ₹9,999. */
export function formatMoneyShort(paise: number): string {
  const rupees = Math.round(paise / 100);
  if (rupees >= 10_000_000) return `₹${(rupees / 10_000_000).toFixed(rupees % 10_000_000 === 0 ? 0 : 1)}Cr`;
  if (rupees >= 100_000) return `₹${(rupees / 100_000).toFixed(rupees % 100_000 === 0 ? 0 : 1)}L`;
  if (rupees >= 1_000) return `₹${(rupees / 1_000).toFixed(rupees % 1_000 === 0 ? 0 : 1)}k`;
  return `₹${rupees.toLocaleString("en-IN")}`;
}

export const rupees = (r: number) => r * 100; // helper for seed / admin input
export const toRupees = (paise: number) => Math.round(paise / 100);
