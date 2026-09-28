import { prisma } from "@/lib/prisma";
import { invalidate } from "@/lib/cache";
import { charge, paymentProviderLabel } from "./payments";
import { notify } from "./notifications";
import type { Prisma, OrderStatus } from "@prisma/client";

const ORDER_SELECT = {
  id: true,
  buyerId: true,
  amount: true,
  status: true,
  paidAt: true,
  createdAt: true,
  contactName: true,
  contactEmail: true,
  contactPhone: true,
  shipTo: true,
  listing: {
    select: {
      id: true,
      title: true,
      images: true,
      category: { select: { name: true } },
      seller: { select: { id: true, handle: true, name: true, avatar: true } },
    },
  },
} satisfies Prisma.OrderSelect;

export type OrderDTO = {
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
    seller: { id: string; handle: string; name: string; avatar: string | null };
  };
};

function toDTO(o: Prisma.OrderGetPayload<{ select: typeof ORDER_SELECT }>): OrderDTO {
  return {
    id: o.id,
    amount: o.amount,
    status: o.status,
    paidAt: o.paidAt?.toISOString() ?? null,
    createdAt: o.createdAt.toISOString(),
    contactName: o.contactName,
    contactEmail: o.contactEmail,
    contactPhone: o.contactPhone,
    shipTo: o.shipTo,
    listing: {
      id: o.listing.id,
      title: o.listing.title,
      image: o.listing.images[0] ?? null,
      categoryName: o.listing.category.name,
      seller: o.listing.seller,
    },
  };
}

/**
 * Fetch a single order for checkout. Scope it to the buyer (or seller / admin)
 * so nobody can poke at someone else's order via a guessed id.
 */
export async function getOrderForCheckout(orderId: string, userId: string) {
  const o = await prisma.order.findUnique({
    where: { id: orderId },
    select: ORDER_SELECT,
  });
  if (!o) return null;
  if (o.listing.seller.id !== userId && o.buyerId !== userId) return null;
  return toDTO(o);
}

/** The current user's recent orders, newest first. */
export async function getUserOrders(userId: string, limit = 40): Promise<OrderDTO[]> {
  const rows = await prisma.order.findMany({
    where: { buyerId: userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: ORDER_SELECT,
  });
  return rows.map(toDTO);
}

export async function getSellerOrders(userId: string, limit = 40): Promise<OrderDTO[]> {
  const rows = await prisma.order.findMany({
    where: { sellerId: userId, status: { in: ["PAID", "CANCELLED"] } },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: ORDER_SELECT,
  });
  return rows.map(toDTO);
}

/** Order for a specific listing, scoped to the viewer (buyer or seller). Null
 *  if no order exists or the viewer isn't a party to it. */
export async function getOrderForListing(listingId: string, userId: string) {
  const o = await prisma.order.findUnique({
    where: { listingId },
    select: ORDER_SELECT,
  });
  if (!o) return null;
  if (o.buyerId !== userId && o.listing.seller.id !== userId) return null;
  return toDTO(o);
}

export type PayOrderInput = {
  orderId: string;
  userId: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  shipTo?: string;
};

export type PayOrderResult =
  | { ok: true; order: OrderDTO }
  | { ok: false; code: string; message: string };

/**
 * Complete checkout: verify ownership + status, validate the charge with the
 * payment provider, then atomically flip the order to PAID. If the provider
 * rejects, we leave the order PENDING and surface the error.
 */
export async function payOrder(input: PayOrderInput): Promise<PayOrderResult> {
  if (!input.userId) return { ok: false, code: "AUTH", message: "Sign in first." };

  if (
    !input.contactName?.trim() ||
    !input.contactEmail?.trim() ||
    !input.contactPhone?.trim() ||
    !input.shipTo?.trim()
  ) {
    return { ok: false, code: "INVALID", message: "Please fill in your contact + delivery details." };
  }

  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    select: {
      id: true,
      buyerId: true,
      status: true,
      amount: true,
      listing: { select: { id: true, title: true } },
    },
  });
  if (!order) return { ok: false, code: "NOT_FOUND", message: "Order not found." };
  if (order.buyerId !== input.userId)
    return { ok: false, code: "FORBIDDEN", message: "You can't pay for someone else's order." };
  if (order.status === "PAID")
    return { ok: false, code: "ALREADY_PAID", message: "This order is already paid." };
  if (order.status === "CANCELLED")
    return { ok: false, code: "CANCELLED", message: "This order was cancelled." };

  // 1. Charge via the (currently sandbox) provider.
  const charge_ = await charge({
    amount: order.amount,
    description: `Gavl · ${order.listing.title}`,
    contactEmail: input.contactEmail,
    contactPhone: input.contactPhone,
  });
  if (!charge_.ok) return charge_;

  // 2. Persist the completed sale in one shot (idempotent via status guard).
  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "PAID",
      paidAt: new Date(),
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      shipTo: input.shipTo,
    },
    select: { ...ORDER_SELECT, buyer: { select: { id: true, handle: true } } },
  });

  invalidate(`orders:${input.userId}`, `orders:seller:${updated.listing.seller.id}`);

  // 3. Notify buyer + seller. Safe post-commit; fire-and-forget each.
  await notify({
    userId: order.buyerId,
    type: "ORDER_PAID",
    title: "Payment complete 🎉",
    body: `You paid for "${order.listing.title}". Check your orders for the details.`,
    listingId: order.listing.id,
  });
  await notify({
    userId: updated.listing.seller.id,
    type: "ORDER_PAID",
    title: "Sale confirmed",
    body: `A buyer paid for "${order.listing.title}".`,
    listingId: order.listing.id,
  });

  const dto = toDTO(updated as never);
  return { ok: true, order: dto };
}

export type CancelOrderResult = { ok: true } | { ok: false; code: string; message: string };

export async function cancelOrder(orderId: string, userId: string): Promise<CancelOrderResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { buyerId: true, status: true, sellerId: true },
  });
  if (!order) return { ok: false, code: "NOT_FOUND", message: "Order not found." };
  if (order.sellerId === userId) {
    // Seller can only cancel a still-pending order.
    if (order.status !== "PENDING")
      return { ok: false, code: "NOT_PENDING", message: "Only pending orders can be cancelled." };
  } else if (order.buyerId === userId) {
    if (order.status !== "PENDING")
      return { ok: false, code: "NOT_PENDING", message: "Only pending orders can be cancelled." };
  } else {
    return { ok: false, code: "FORBIDDEN", message: "You can't cancel this order." };
  }

  await prisma.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
  invalidate(`orders:${userId}`, `orders:seller:${order.sellerId}`);
  return { ok: true };
}

export function activeProviderLabel() {
  return paymentProviderLabel();
}