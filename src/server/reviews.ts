import { prisma } from "@/lib/prisma";
import { notify } from "./notifications";

export type ReviewDTO = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  buyer: { id: string; handle: string; name: string; avatar: string | null };
  listing: { id: string; title: string };
};

function toDTO(r: {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  buyer: { id: string; handle: string; name: string; avatar: string | null };
  listing: { id: string; title: string };
}): ReviewDTO {
  return {
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt.toISOString(),
    buyer: r.buyer,
    listing: r.listing,
  };
}

export type SubmitReviewResult = { ok: true; review: ReviewDTO } | { ok: false; code: string; message: string };

/**
 * Buyer rates the seller for one completed (PAID) order. Exactly one review
 * per order — the unique orderId is the backstop, the pre-check is the UX.
 */
export async function submitReview(input: {
  orderId: string;
  userId: string;
  rating: number;
  comment?: string;
}): Promise<SubmitReviewResult> {
  if (!input.userId) return { ok: false, code: "AUTH", message: "Sign in first." };
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    return { ok: false, code: "INVALID_RATING", message: "Rating must be 1–5 stars." };
  }
  const comment = input.comment?.trim().slice(0, 1000) || null;

  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    select: {
      id: true,
      buyerId: true,
      sellerId: true,
      listingId: true,
      status: true,
      listing: { select: { title: true } },
      review: { select: { id: true } },
    },
  });
  if (!order) return { ok: false, code: "NOT_FOUND", message: "Order not found." };
  if (order.buyerId !== input.userId)
    return { ok: false, code: "FORBIDDEN", message: "Only the buyer can review this order." };
  if (order.status !== "PAID")
    return { ok: false, code: "NOT_PAID", message: "You can review once the order is paid." };
  if (order.review) return { ok: false, code: "ALREADY_REVIEWED", message: "You already reviewed this order." };

  try {
    const review = await prisma.$transaction(async (tx) => {
      const created = await tx.review.create({
        data: {
          orderId: order.id,
          listingId: order.listingId,
          sellerId: order.sellerId,
          buyerId: input.userId,
          rating: input.rating,
          comment,
        },
        include: {
          buyer: { select: { id: true, handle: true, name: true, avatar: true } },
          listing: { select: { id: true, title: true } },
        },
      });
      // Fold the new rating into the seller's denormalised average.
      const seller = await tx.user.findUnique({
        where: { id: order.sellerId },
        select: { sellerRatingAvg: true, sellerRatingCount: true },
      });
      const count = (seller?.sellerRatingCount ?? 0) + 1;
      const avg = ((seller?.sellerRatingAvg ?? 0) * (count - 1) + input.rating) / count;
      await tx.user.update({
        where: { id: order.sellerId },
        data: { sellerRatingAvg: avg, sellerRatingCount: count },
      });
      return created;
    });

    await notify({
      userId: order.sellerId,
      type: "REVIEW_RECEIVED",
      title: `⭐ ${input.rating}/5 from a buyer`,
      body: `Your sale "${order.listing.title}" got a ${input.rating}-star review.`,
      listingId: order.listingId,
    });

    return { ok: true, review: toDTO(review) };
  } catch (e) {
    // Lost a race with a concurrent submit — same friendly message.
    if (e && typeof e === "object" && (e as { code?: string }).code === "P2002") {
      return { ok: false, code: "ALREADY_REVIEWED", message: "You already reviewed this order." };
    }
    throw e;
  }
}

/** Newest reviews for a seller, plus their aggregate (single source: User row). */
export async function getSellerReviews(sellerId: string, limit = 10) {
  const [seller, rows] = await Promise.all([
    prisma.user.findUnique({
      where: { id: sellerId },
      select: { sellerRatingAvg: true, sellerRatingCount: true },
    }),
    prisma.review.findMany({
      where: { sellerId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        buyer: { select: { id: true, handle: true, name: true, avatar: true } },
        listing: { select: { id: true, title: true } },
      },
    }),
  ]);
  return {
    avg: seller?.sellerRatingAvg ?? 0,
    count: seller?.sellerRatingCount ?? 0,
    reviews: rows.map(toDTO),
  };
}
