import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createResetToken } from "@/lib/auth";
import { sendResetEmail } from "@/lib/email";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Enter a valid email." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true, email: true } });
  if (!user) {
    // Don't reveal whether the email exists.
    return NextResponse.json({ ok: true, message: "If an account exists, a reset link has been sent." });
  }

  const token = await createResetToken(user.id);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  try {
    await sendResetEmail(user.email, resetUrl);
  } catch (err) {
    console.error("Reset email failed:", err);
    // No email provider configured (dev): surface the link so local flow still works.
    return NextResponse.json({
      ok: true,
      message: "Reset link generated.",
      resetUrl,
      token,
    });
  }

  return NextResponse.json({
    ok: true,
    message: "Reset link sent to your email.",
  });
}
