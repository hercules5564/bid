import { PrismaClient, Prisma } from "@prisma/client";

// Reuse a single client across HMR reloads in dev; the custom server process
// is long-lived so this also keeps the pool from ballooning.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Pool size and pool_timeout are set on the connection string (see .env) rather
// than here — on Neon the pooled endpoint is what keeps us under the connection
// cap, and the timeout covers the first query after its compute auto-resumes.
const base =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = base;

/**
 * Options for every interactive `$transaction` in this app.
 *
 * Prisma defaults to a 5s transaction timeout. Bidding runs ~8 sequential
 * round-trips inside one transaction (row lock, demote, insert, update stats,
 * upsert order...) and this database is remote, so 5s is routinely blown.
 * Prisma reports the timeout as the deeply misleading P2028 "Transaction not
 * found. Transaction ID is invalid, refers to an old closed transaction" —
 * which looks like a connection-pooling bug and is not.
 */
export const TX_OPTS = { maxWait: 20_000, timeout: 30_000 } as const;

/**
 * Errors that mean the query never reached Postgres, so it is always safe to
 * run again. Everything else (unique violations, P2002 on bid amount, etc.) is
 * the database telling us the write landed — retrying those would duplicate a
 * bid or an order.
 */
function isConnectFailure(e: unknown): boolean {
  if (e instanceof Prisma.PrismaClientInitializationError) return true;
  if (e instanceof Prisma.PrismaClientRustPanicError) return false;
  const code = (e as { code?: string } | null)?.code;
  // P1001 can't reach server · P1002 timed out · P1008 operation timeout
  // P1017 server closed the connection · P2024 timed out fetching a connection
  return code === "P1001" || code === "P1002" || code === "P1008" || code === "P1017" || code === "P2024";
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Retry connection-establishment failures. Neon auto-resumes on the first
 * connection after going idle, and that first attempt can fail — without this
 * a page render blows up with "Can't reach database server" even though the
 * database is fine a second later.
 */
export const prisma = base.$extends({
  query: {
    $allOperations: async ({ args, query }) => {
      let lastError: unknown;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          return await query(args);
        } catch (e) {
          if (!isConnectFailure(e)) throw e;
          lastError = e;
          await sleep(250 * 2 ** attempt);
        }
      }
      throw lastError;
    },
  },
});
