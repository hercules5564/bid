import { NextRequest, NextResponse } from "next/server";
import { refreshStatuses, closeDueAuctions } from "@/server/lifecycle";

export const dynamic = "force-dynamic";

const KEY = process.env.CRON_SECRET || process.env.AUTH_SECRET || "gavl-dev-secret";

// In-process guard so a slow tick can't overlap the next one in this server.
let running = false;

export async function POST(req: NextRequest) {
  if (req.headers.get("x-cron-key") !== KEY) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (running) return NextResponse.json({ ok: true, skipped: true });
  running = true;
  try {
    const now = new Date();
    await refreshStatuses(now);
    const closed = await closeDueAuctions(now);
    return NextResponse.json({ ok: true, closed, at: now.toISOString() });
  } finally {
    running = false;
  }
}
