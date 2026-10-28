import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyResetToken } from "@/lib/auth";

const schema = z.object({
  token: z.string().min(1, "Token is required."),
  password: z.string().min(6, "Password must be at least 6 characters").max(200, "Password must be at most 200 characters"),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const userId = await verifyResetToken(parsed.data.token);
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Invalid or expired reset token." }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(parsed.data.password) },
  });

  return NextResponse.json({ ok: true, message: "Password reset successfully." });
}
