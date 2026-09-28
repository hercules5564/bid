import "dotenv/config";
// Pin the accounting timezone so leaderboard day/week/month boundaries and the
// Sunday-20:00 Showdown rotation are IST, not the host's (often UTC) local time.
process.env.TZ = process.env.TZ || "Asia/Kolkata";

import { createServer } from "node:http";
import next from "next";
import { Server as SocketServer } from "socket.io";
import { jwtVerify } from "jose";
import cron from "node-cron";
import { SocketEvent, Room } from "./src/lib/events.js";

const dev = process.env.NODE_ENV !== "production";
const port = Number(process.env.PORT || 3000);
const hostname = "localhost";
const CRON_KEY = process.env.CRON_SECRET || process.env.AUTH_SECRET || "gavl-dev-secret";

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

await app.prepare();

const httpServer = createServer((req, res) => handle(req, res));

const io = new SocketServer(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// Expose the io instance to Next route handlers running in this same process.
globalThis.__gavlIo = io;

// ---- Socket authentication -------------------------------------------------
// The browser sends the httpOnly session cookie on the handshake (same origin).
// We verify it once and trust ONLY the derived userId — never a client-sent id.
const authSecret = new TextEncoder().encode(process.env.AUTH_SECRET || "gavl-dev-secret-change-me");

function parseCookie(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > -1) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

io.use(async (socket, next) => {
  try {
    const token = parseCookie(socket.handshake.headers.cookie).gavl_session;
    if (token) {
      const { payload } = await jwtVerify(token, authSecret);
      socket.data.userId = payload.uid;
    }
  } catch {
    // anonymous socket — may still watch public listing/showdown rooms
  }
  next();
});

function emitPresence(room) {
  if (!room.startsWith("listing:") && room !== "showdown") return;
  const count = io.sockets.adapter.rooms.get(room)?.size ?? 0;
  io.to(room).emit(SocketEvent.Presence, { room, count });
}

io.on("connection", (socket) => {
  socket.join(Room.global());

  socket.on(SocketEvent.JoinListing, (id) => {
    if (typeof id !== "string") return;
    socket.join(Room.listing(id));
    emitPresence(Room.listing(id));
  });
  socket.on(SocketEvent.LeaveListing, (id) => {
    if (typeof id !== "string") return;
    socket.leave(Room.listing(id));
    emitPresence(Room.listing(id));
  });
  socket.on(SocketEvent.JoinUser, () => {
    // Ignore any client-supplied id; only join the verified session's own room.
    if (socket.data.userId) socket.join(Room.user(socket.data.userId));
  });
  socket.on(SocketEvent.JoinShowdown, () => {
    socket.join(Room.showdown());
    emitPresence(Room.showdown());
  });
  socket.on(SocketEvent.LeaveShowdown, () => {
    socket.leave(Room.showdown());
    emitPresence(Room.showdown());
  });

  socket.on("disconnecting", () => {
    for (const room of socket.rooms) {
      // rooms still include the ones we're leaving; recompute after this tick.
      setTimeout(() => emitPresence(room), 0);
    }
  });
});

// ---- Scheduler ----------------------------------------------------------
async function ping(path) {
  try {
    await fetch(`http://127.0.0.1:${port}${path}`, {
      method: "POST",
      headers: { "x-cron-key": CRON_KEY },
    });
  } catch {
    // server still warming up, or a transient error — the next tick retries.
  }
}

httpServer.listen(port, () => {
  const banner = dev ? "dev" : "prod";
  console.log(`\n  ▲ Gavl (${banner}) — http://${hostname}:${port}\n  ⚡ realtime + scheduler online\n`);

  // Fast tick: flip statuses + close due auctions every 5s.
  setInterval(() => ping("/api/cron/tick"), 5000);
  // Kick one immediately, and make sure a Showdown exists without clobbering a seeded one.
  setTimeout(() => ping("/api/cron/tick"), 1500);
  setTimeout(() => ping("/api/cron/showdown?ensure=1"), 2500);

  // Weekly Showdown rotation — Sunday 20:00 server-local.
  cron.schedule("0 20 * * 0", () => ping("/api/cron/showdown"));
});
