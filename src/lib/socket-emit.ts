import { SocketEvent, Room } from "./events.js";
import type { Server as IOServer } from "socket.io";

// The custom server (server.mjs) stashes the Socket.io instance here so that
// Next route handlers — running in the same process — can broadcast.
function io(): IOServer | null {
  return (globalThis as unknown as { __gavlIo?: IOServer }).__gavlIo ?? null;
}

export type BidNewPayload = {
  listingId: string;
  amount: number;
  currentPrice: number;
  minNextBid: number;
  bidCount: number;
  bidder: { id: string; handle: string; avatar: string | null };
  createdAt: string;
};

export type TimerPayload = {
  listingId: string;
  endsAt: string;
  status: string;
  extended?: boolean;
};

export type ClosedPayload = {
  listingId: string;
  status: string;
  winner: { id: string; handle: string; avatar: string | null } | null;
  finalPrice: number;
};

export type ShowdownPayload = {
  listingId: string;
  currentPrice: number;
  bidCount: number;
  activeBidders: number;
};

export type NotifyPayload = {
  id: string;
  type: string;
  title: string;
  body: string;
  listingId: string | null;
  createdAt: string;
};

export function emitBidNew(p: BidNewPayload) {
  io()?.to(Room.listing(p.listingId)).emit(SocketEvent.BidNew, p);
}

export function emitTimer(p: TimerPayload) {
  io()?.to(Room.listing(p.listingId)).emit(SocketEvent.ListingTimer, p);
}

export function emitClosed(p: ClosedPayload) {
  io()?.to(Room.listing(p.listingId)).emit(SocketEvent.ListingClosed, p);
}

export function emitShowdown(p: ShowdownPayload) {
  io()?.to(Room.showdown()).emit(SocketEvent.ShowdownUpdate, p);
}

export function emitLeaderboard() {
  io()?.to(Room.global()).emit(SocketEvent.LeaderboardUpdate, { at: new Date().toISOString() });
}

export function emitNotify(userId: string, p: NotifyPayload) {
  io()?.to(Room.user(userId)).emit(SocketEvent.Notify, p);
}

/** Broadcast a fresh notification to a set of users (Showdown starting, etc.). */
export function emitNotifyMany(userIds: string[], make: (userId: string) => NotifyPayload) {
  const server = io();
  if (!server) return;
  for (const id of userIds) server.to(Room.user(id)).emit(SocketEvent.Notify, make(id));
}

export { Room, SocketEvent };
