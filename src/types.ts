// Client-facing DTOs. API routes serialise Prisma rows into these (dates -> ISO
// strings) so client components never touch Date/Prisma objects directly.

export type DurationType = "HOURLY" | "DAILY" | "WEEKLY" | "WEEKLY_SHOWDOWN";
export type ListingStatus =
  | "SCHEDULED"
  | "LIVE"
  | "ENDING_SOON"
  | "CLOSED"
  | "SOLD"
  | "UNSOLD";

export type UserBadge = {
  id: string;
  handle: string;
  name: string;
  avatar: string | null;
};

export type ListingSummary = {
  id: string;
  title: string;
  image: string | null;
  category: { name: string; slug: string; icon: string; accent: string };
  currentPrice: number;
  minNextBid: number;
  bidCount: number;
  durationType: DurationType;
  status: ListingStatus;
  endsAt: string;
  isFeatured: boolean;
};

export type BidItem = {
  id: string;
  amount: number;
  createdAt: string;
  bidder: UserBadge;
  isWinning: boolean;
};

export type ListingDetail = ListingSummary & {
  description: string;
  images: string[];
  startingPrice: number;
  bidIncrement: number;
  buyNowPrice: number | null;
  viewCount: number;
  seller: UserBadge;
  winner: UserBadge | null;
  startsAt: string;
  bids: BidItem[];
  watching: boolean;
  activeBidders: number;
};

export type LeaderboardPeriod = "DAY" | "WEEK" | "MONTH" | "ALL_TIME";

export type LeaderboardEntry = {
  rank: number;
  user: UserBadge;
  score: number;
  auctionsWon: number;
  highestSingleBid: number;
};

export type LeaderboardBoard = {
  period: LeaderboardPeriod;
  entries: LeaderboardEntry[];
  you: LeaderboardEntry | null;
};

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  listingId: string | null;
  read: boolean;
  createdAt: string;
};

export type OrderStatus = "PENDING" | "PAID" | "CANCELLED";

export type OrderItem = {
  id: string;
  amount: number;
  status: OrderStatus;
  paidAt: string | null;
  createdAt: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  shipTo: string | null;
  listing: {
    id: string;
    title: string;
    image: string | null;
    categoryName: string;
    seller: UserBadge;
  };
};
