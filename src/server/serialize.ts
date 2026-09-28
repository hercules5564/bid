import type {
  BidItem,
  ListingDetail,
  ListingSummary,
  UserBadge,
} from "@/types";

type AnyUser = {
  id: string;
  handle: string;
  name: string;
  avatar: string | null;
};

export function userBadge(u: AnyUser): UserBadge {
  return { id: u.id, handle: u.handle, name: u.name, avatar: u.avatar };
}

type AnyCategory = { name: string; slug: string; icon: string; accent: string };

type AnyListing = {
  id: string;
  title: string;
  images: string[];
  currentPrice: number;
  bidIncrement: number;
  bidCount: number;
  durationType: string;
  status: string;
  endsAt: Date;
  isFeatured: boolean;
  category: AnyCategory;
};

export function listingSummary(l: AnyListing): ListingSummary {
  return {
    id: l.id,
    title: l.title,
    image: l.images[0] ?? null,
    category: {
      name: l.category.name,
      slug: l.category.slug,
      icon: l.category.icon,
      accent: l.category.accent,
    },
    currentPrice: l.currentPrice,
    minNextBid: l.currentPrice + l.bidIncrement,
    bidCount: l.bidCount,
    durationType: l.durationType as ListingSummary["durationType"],
    status: l.status as ListingSummary["status"],
    endsAt: l.endsAt.toISOString(),
    isFeatured: l.isFeatured,
  };
}

export function bidItem(b: {
  id: string;
  amount: number;
  createdAt: Date;
  isWinning: boolean;
  user: AnyUser;
}): BidItem {
  return {
    id: b.id,
    amount: b.amount,
    createdAt: b.createdAt.toISOString(),
    isWinning: b.isWinning,
    bidder: userBadge(b.user),
  };
}

type FullListing = AnyListing & {
  description: string;
  startingPrice: number;
  buyNowPrice: number | null;
  viewCount: number;
  startsAt: Date;
  seller: AnyUser;
  winner: AnyUser | null;
  bids: Array<{ id: string; amount: number; createdAt: Date; isWinning: boolean; user: AnyUser }>;
};

export function listingDetail(
  l: FullListing,
  extra: { watching: boolean; activeBidders: number }
): ListingDetail {
  return {
    ...listingSummary(l),
    description: l.description,
    images: l.images,
    startingPrice: l.startingPrice,
    bidIncrement: l.bidIncrement,
    buyNowPrice: l.buyNowPrice,
    viewCount: l.viewCount,
    startsAt: l.startsAt.toISOString(),
    seller: userBadge(l.seller),
    winner: l.winner ? userBadge(l.winner) : null,
    bids: l.bids.map(bidItem),
    watching: extra.watching,
    activeBidders: extra.activeBidders,
  };
}
