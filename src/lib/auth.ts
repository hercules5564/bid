import "server-only";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { cached } from "./cache";

export const SESSION_COOKIE = "gavl_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const secret = () => {
  const s = process.env.AUTH_SECRET;
  // Fail closed in production rather than silently signing with a public default.
  if ((!s || s.length < 16) && process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET must be set to a strong value (>=16 chars) in production.");
  }
  return new TextEncoder().encode(s || "gavl-dev-secret-change-me");
};

export function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}

export function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function createSessionToken(userId: string): Promise<string> {
  return new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
}

async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return (payload.uid as string) ?? null;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  // Only mark Secure when actually served over HTTPS — otherwise the browser
  // refuses to send the cookie over http://localhost and login silently breaks.
  // Set COOKIE_SECURE=true when deploying behind TLS.
  secure: process.env.COOKIE_SECURE === "true",
  path: "/",
  maxAge: MAX_AGE,
};

/** Set the session cookie (call inside a route handler / server action). */
export async function startSession(userId: string) {
  const token = await createSessionToken(userId);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions);
}

export async function endSession() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
}

export async function getSessionUserId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

const publicUserSelect = {
  id: true,
  handle: true,
  name: true,
  email: true,
  avatar: true,
  role: true,
  totalBids: true,
  auctionsWon: true,
  totalWonValue: true,
  highestSingleBid: true,
  createdAt: true,
} as const;

export async function getCurrentUser() {
  const uid = await getSessionUserId();
  if (!uid) return null;
  // Cached briefly so rapid navigation doesn't re-fetch the nav user every page.
  return cached(`user:${uid}`, 5000, () =>
    prisma.user.findUnique({ where: { id: uid }, select: publicUserSelect })
  );
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
