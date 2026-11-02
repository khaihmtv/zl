import { NextRequest, NextResponse } from "next/server";
import { ZALO_BOT_URL } from "@/lib/zalo-bot-url";

export async function GET() {
  try {
    const res = await fetch(`${ZALO_BOT_URL}/logs`, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Không thể kết nối đến Zalo Bot service" }, { status: 502 });
  }
}

export async function DELETE() {
  try {
    const res = await fetch(`${ZALO_BOT_URL}/logs`, {
      method: "DELETE",
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Không thể kết nối đến Zalo Bot service" }, { status: 502 });
  }
}