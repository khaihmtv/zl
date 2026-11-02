import { NextResponse } from "next/server";
import { ZALO_BOT_URL } from "@/lib/zalo-bot-url";

export async function GET() {
  try {
    const res = await fetch(`${ZALO_BOT_URL}/status`, { cache: "no-store" });
    if (!res.ok) throw new Error("not ok");
    const data = await res.json();
    return NextResponse.json({ ...data, serviceConnected: true });
  } catch {
    return NextResponse.json(
      {
        loggedIn: false,
        isSending: false,
        browserStarting: false,
        sessionExists: false,
        serviceConnected: false,
        lastError: undefined,
        stats: { total: 0, success: 0, warning: 0, failed: 0 },
      },
      { status: 200 }
    );
  }
}