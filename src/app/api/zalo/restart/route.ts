import { NextResponse } from "next/server";
import { ZALO_BOT_URL } from "@/lib/zalo-bot-url";

export async function POST() {
  try {
    const res = await fetch(`${ZALO_BOT_URL}/restart`, {
      method: "POST",
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "Không thể kết nối đến Zalo Bot service" }, { status: 502 });
  }
}