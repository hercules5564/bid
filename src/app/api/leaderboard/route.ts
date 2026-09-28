import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { computeAllBoards } from "@/server/leaderboard";

export const dynamic = "force-dynamic";

export async function GET() {
  const uid = await getSessionUserId();
  const boards = await computeAllBoards(uid);
  return NextResponse.json({ ok: true, boards });
}
