import { NextRequest, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const uid = await getSessionUserId();
  if (!uid) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const id = typeof body?.id === "string" ? body.id : null;

  if (id) {
    await prisma.notification.updateMany({ where: { id, userId: uid }, data: { read: true } });
  } else {
    await prisma.notification.updateMany({ where: { userId: uid, read: false }, data: { read: true } });
  }
  return NextResponse.json({ ok: true });
}
