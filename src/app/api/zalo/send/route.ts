import { NextRequest, NextResponse } from "next/server";
import { ZALO_BOT_URL } from "@/lib/zalo-bot-url";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${ZALO_BOT_URL}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Không thể kết nối đến Zalo Bot service" }, { status: 502 });
  }
}
