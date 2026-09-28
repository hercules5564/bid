# Gavl — real-time auction house

Live bidding, flash lots, a weekly headline **Showdown**, and game-like leaderboards.
Server-authoritative pricing over Socket.io, with a scheduler that closes auctions,
resolves winners, and rotates the Showdown.

Stack: **Next.js 15 (App Router) · TypeScript · Tailwind · Prisma/Postgres · Socket.io** — all in one Node process (custom server).

---

## Quick start

```bash
# 1. install (also generates the Prisma client)
npm install

# 2. point it at a Postgres database — edit .env and set DATABASE_URL
#    Neon / Supabase / Railway / local all work:
#    DATABASE_URL="postgresql://user:pass@host:5432/gavl?sslmode=require"

# 3. create the schema + seed a demoable dataset
npm run db:push
npm run db:seed

# 4a. run it in dev (hot reload, recompiles routes on first hit)
npm run dev

# 4b. …or run a stable production build (faster, recommended for demoing)
npm run build && npm start
```

Open http://localhost:3001 (the port is set by `PORT` in `.env`; this project ships `PORT=3001`).

> Serving over plain http://localhost, leave `COOKIE_SECURE` unset/false. Set `COOKIE_SECURE=true` only behind HTTPS, or the browser won't send the session cookie.

**Demo logins** (password `password123` for all):
- `admin@gavl.live` — the auction house (ADMIN: can list items, rotate the Showdown)
- `rhea@gavl.live` — a bidder with wins, watchlist and notifications

> Reset the DB anytime with `npm run db:reset` (force-push + reseed).

---

## How it fits together

```
server.mjs ─┬─ Next.js request handler          (all pages + /api routes)
            ├─ Socket.io server                  (global.__gavlIo, rooms per listing/user/showdown)
            └─ scheduler                         every 5s → POST /api/cron/tick
                                                 Sun 20:00 → POST /api/cron/showdown
```

- **Bidding is server-authoritative.** `src/server/bidding.ts` runs the whole
  check-and-write inside a Prisma interactive transaction that opens with
  `SELECT … FOR UPDATE` on the listing row. Two concurrent bids are serialised, so
  only one can become the winning bid. Price, timer and validity are decided on the
  server; the client is never trusted.
- **Anti-snipe.** A bid landing within the final `ANTISNIPE_WINDOW_SECONDS` pushes
  `ends_at` out by that window and broadcasts the new timer.
- **Realtime.** On a committed bid the server broadcasts `bid:new` to everyone in the
  listing room; outbid users get an instant `OUTBID` notification in their user room.
- **Closing.** The 5-second tick flips `SCHEDULED→LIVE→ENDING_SOON` and closes any
  auction past `ends_at`, re-locking the row so a just-extended auction isn't closed
  early. The highest bidder is crowned, stats update, `WON`/`LOST` fire.
- **Leaderboards** are computed on the fly (`src/server/leaderboard.ts`) and pushed
  to refetch via `leaderboard:update` when an auction closes.

## Documented design choices

- **Money** is stored as integer **paise** everywhere (no floats). Formatted at the UI edge.
- **Weekly Showdown = the priciest lot.** On rotation the eligible listing with the
  highest `current_price` (which equals `starting_price` before any bids) is promoted
  to `WEEKLY_SHOWDOWN`, featured, and every user is notified. The previous Showdown is
  force-closed. Schedule: **Sunday 20:00** server-local (`server.mjs`).
- **Leaderboard scoring (default `WINNING_VALUE`).** Users are ranked by the total
  value of winning bids in the period (money committed to auctions they won),
  tie-broken by number of auctions won. Each user's highest single bid is shown as a
  stat. Swap the metric with `SCORING_METRIC=BID_VOLUME|BID_COUNT` in `.env` — one config value.
- **Period windows:** day = since local midnight, week = since Monday 00:00,
  month = since the 1st, all-time = unbounded (the Hall of Fame).

## Configuration (`.env`)

| Var | Default | Meaning |
|---|---|---|
| `DATABASE_URL` | — | Postgres connection string (required) |
| `AUTH_SECRET` | dev fallback | signs the session JWT |
| `ANTISNIPE_WINDOW_SECONDS` | `30` | anti-snipe extension window |
| `ENDING_SOON_SECONDS` | `300` | when a lot flips to ENDING_SOON |
| `SCORING_METRIC` | `WINNING_VALUE` | leaderboard metric |
| `SHOWDOWN_DURATION_HOURS` | `168` | Showdown length once opened |
| `NEXT_PUBLIC_SOCKET_URL` | `http://localhost:3000` | socket origin for the browser |

## Project layout

```
server.mjs                 custom server: Next + Socket.io + scheduler
prisma/schema.prisma       data model (paise money, enums, showdown events)
prisma/seed.ts             categories, users, lots across all durations, live Showdown, closed lots
src/lib/                   prisma, auth (JWT+bcrypt), money, time, socket contract, config
src/server/                bidding engine, lifecycle, leaderboard, showdown, queries  (server-authoritative)
src/app/api/               auth, bids, buy-now, watch, listings, notifications, leaderboard, cron
src/app/                   home, browse, listing, showdown, leaderboards, dashboard, profile, admin, auth
src/components/            realtime UI (bid feed, live price, countdown, leaderboards, notifications)
```

## Switching database provider

Everything targets Postgres. To move hosts, just change `DATABASE_URL` and
`npm run db:push`. (The schema uses native arrays + enums, so SQLite would need the
provider swapped in `schema.prisma` and `images` remodelled.)
