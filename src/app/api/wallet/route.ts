import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth";
import { getWalletState } from "@/server/wallet";

export const dynamic = "force-dynamic";

export async function GET() {
  const uid = await getSessionUserId();
  if (!uid) return NextResponse.json({ ok: false, code: "AUTH", message: "Sign in first." }, { status: 401 });
  const wallet = await getWalletState(uid);
  return NextResponse.json({ ok: true, wallet });
}
