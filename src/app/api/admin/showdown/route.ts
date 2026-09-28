import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { rotateShowdown } from "@/server/showdown";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ ok: false, error: "Admins only." }, { status: 403 });
  }
  const result = await rotateShowdown();
  return NextResponse.json({ ok: true, ...result });
}
