// Client-safe dispute constants (the server module imports prisma and can't
// be bundled into client components).
export const DISPUTE_REASON_OPTIONS = [
  "Item not delivered",
  "Item not as described",
  "Item arrived damaged",
  "Seller unresponsive",
  "Something else",
];
