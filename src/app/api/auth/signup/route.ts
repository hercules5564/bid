import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, startSession } from "@/lib/auth";

const schema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(60, "Name must be at most 60 characters"),
  handle: z
    .string()
    .trim()
    .min(3, "Handle must be at least 3 characters")
    .max(30, "Handle must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Handle can only use letters, numbers and underscores"),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(200, "Password must be at most 200 characters"),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { name, email, password } = parsed.data;
  const handle = parsed.data.handle;

  const clash = await prisma.user.findFirst({
    where: { OR: [{ email }, { handle: { equals: handle, mode: "insensitive" } }] },
    select: { email: true, handle: true },
  });
  if (clash) {
    const field = clash.email === email ? "email" : "handle";
    return NextResponse.json({ ok: false, error: `That ${field} is already taken.` }, { status: 409 });
  }

  let user;
  try {
    user = await prisma.user.create({
      data: {
        name,
        handle,
        email,
        passwordHash: await hashPassword(password),
        avatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(handle)}`,
      },
      select: { id: true, handle: true, name: true, email: true, avatar: true, role: true },
    });
  } catch (e) {
    // Unique constraint lost the race with a concurrent signup — the DB is the
    // source of truth, so surface the same friendly 409 as the pre-check.
    if (e && typeof e === "object" && (e as { code?: string }).code === "P2002") {
      return NextResponse.json({ ok: false, error: "That email or handle is already taken." }, { status: 409 });
    }
    throw e;
  }

  await startSession(user.id);
  return NextResponse.json({ ok: true, user });
}
