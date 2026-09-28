import { NextRequest, NextResponse } from "next/server";
import { rotateShowdown, getActiveShowdown } from "@/server/showdown";

export const dynamic = "force-dynamic";

const KEY = process.env.CRON_SECRET || process.env.AUTH_SECRET || "gavl-dev-secret";

export async function POST(req: NextRequest) {
  if (req.headers.get("x-cron-key") !== KEY) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  // ensure=1 → only create a Showdown if none is active (used on boot so we
  // don't clobber a freshly seeded one).
  const ensure = new URL(req.url).searchParams.get("ensure");
  if (ensure) {
    const active = await getActiveShowdown();
    if (active) return NextResponse.json({ ok: true, skipped: true });
  }
  const result = await rotateShowdown();
  return NextResponse.json({ ok: true, ...result });
}
