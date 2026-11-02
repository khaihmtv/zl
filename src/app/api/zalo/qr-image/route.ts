import { NextResponse } from "next/server";
import { ZALO_BOT_URL } from "@/lib/zalo-bot-url";

export async function GET() {
  try {
    const res = await fetch(`${ZALO_BOT_URL}/qr-image`, { cache: "no-store" });

    if (res.status === 200) {
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("image")) {
        const buffer = await res.arrayBuffer();
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "no-store",
          },
        });
      } else {
        // JSON response (e.g. logged_in)
        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
      }
    }

    if (res.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    return new NextResponse(null, { status: res.status });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}