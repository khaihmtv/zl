import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ZALO_BOT_URL } from "@/lib/zalo-bot-url";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
}

// GET /api/orders?phone=xxx - List records grouped by date
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone") || "";

    const where: any = {};
    if (phone) where.phone = { contains: phone };

    const records = await db.paymentRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    // Group by date
    const grouped: Record<string, { date: string; total: number; records: any[] }> = {};
    for (const r of records) {
      const dateKey = new Date(r.createdAt).toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      if (!grouped[dateKey]) {
        grouped[dateKey] = { date: dateKey, total: 0, records: [] };
      }
      grouped[dateKey].total += r.amount;
      grouped[dateKey].records.push({
        ...r,
        amountFormatted: formatCurrency(r.amount),
        time: new Date(r.createdAt).toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      });
    }

    const days = Object.values(grouped);
    const grandTotal = records.reduce((s, r) => s + r.amount, 0);

    return NextResponse.json({ days, grandTotal, total: records.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/orders - Create record + optionally send Zalo
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, name, amount, note, sendZalo } = body;

    if (!phone?.trim() || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "Vui lòng nhập SĐT và số tiền" },
        { status: 400 }
      );
    }

    const cleanPhone = phone.trim();
    const cleanName = name?.trim() || null;
    const cleanAmount = Math.round(Number(amount));
    const cleanNote = note?.trim() || null;

    const msg = `📦 ĐƠN HÀNG
━━━━━━━━━━━━━━━
💰 ${formatCurrency(cleanAmount)}
\n
📅 ${new Date().toLocaleString("vi-VN")}${cleanNote ? `\n📝 ${cleanNote}` : "\n📝 Anh/Chị chuyển tiền hàng xong cho em xin bill"}`;

    // Save to DB
    const record = await db.paymentRecord.create({
      data: {
        phone: cleanPhone,
        name: cleanName,
        amount: cleanAmount,
        note: cleanNote,
        sent: false,
      },
    });

    // Send via Zalo if requested
    if (sendZalo) {
      try {
        const res = await fetch(`${ZALO_BOT_URL}/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: cleanPhone, message: msg }),
        });
        const data = await res.json();
        if (res.ok && data.status !== "failed") {
          await db.paymentRecord.update({
            where: { id: record.id },
            data: { sent: true, sentAt: new Date() },
          });
          return NextResponse.json({ record: { ...record, sent: true, sentAt: new Date() }, zaloResult: data });
        }
        return NextResponse.json({ record, zaloResult: data, warning: "Gửi Zalo thất bại nhưng đã lưu DB" }, { status: 202 });
      } catch {
        return NextResponse.json({ record, warning: "Không kết nối được Zalo Bot nhưng đã lưu DB" }, { status: 202 });
      }
    }

    return NextResponse.json({ record }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
