import { prisma } from "@/lib/prisma";
import { emitNotify } from "@/lib/socket-emit";

type NotifKind =
  | "OUTBID"
  | "WON"
  | "LOST"
  | "ENDING_SOON"
  | "SHOWDOWN_STARTING"
  | "BID_PLACED"
  | "ORDER_PAID"
  | "ORDER_CANCELLED";

/**
 * Persist a notification and push it live to the user's socket room.
 * Safe to call after a transaction commits.
 */
export async function notify(args: {
  userId: string;
  type: NotifKind;
  title: string;
  body: string;
  listingId?: string | null;
}) {
  const n = await prisma.notification.create({
    data: {
      userId: args.userId,
      type: args.type,
      title: args.title,
      body: args.body,
      listingId: args.listingId ?? null,
    },
  });
  emitNotify(args.userId, {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    listingId: n.listingId,
    createdAt: n.createdAt.toISOString(),
  });
  return n;
}

/** Bulk insert (e.g. Showdown starting for everyone) + push to each room. */
export async function notifyMany(
  userIds: string[],
  make: (userId: string) => { type: NotifKind; title: string; body: string; listingId?: string | null }
) {
  if (userIds.length === 0) return;
  const rows = userIds.map((userId) => {
    const m = make(userId);
    return {
      userId,
      type: m.type,
      title: m.title,
      body: m.body,
      listingId: m.listingId ?? null,
    };
  });
  await prisma.notification.createMany({ data: rows });
  // Re-read to get ids + timestamps for the live push.
  const fresh = await prisma.notification.findMany({
    where: { userId: { in: userIds }, type: rows[0].type },
    orderBy: { createdAt: "desc" },
    take: userIds.length,
  });
  for (const n of fresh) {
    emitNotify(n.userId, {
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      listingId: n.listingId,
      createdAt: n.createdAt.toISOString(),
    });
  }
}
