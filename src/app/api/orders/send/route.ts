import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ZALO_BOT_URL } from "@/lib/zalo-bot-url";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN").format(amount) + "đ";
}

function buildOrderMessage(order: any): string {
  const c = order.customer;
  let msg = `📦 THÔNG TIN ĐƠN HÀNG\n`;
  msg += `━━━━━━━━━━━━━━━━━━\n`;
  msg += `👤 Khách hàng: ${c.name}\n`;
  msg += `📱 SĐT: ${c.phone}\n`;
  msg += `📋 Mã đơn: ${order.id.slice(-8).toUpperCase()}\n`;
  msg += `📅 Ngày: ${new Date(order.createdAt).toLocaleDateString("vi-VN")}\n`;
  msg += `━━━━━━━━━━━━━━━━━━\n`;
  msg += `\nChi tiết mặt hàng:\n`;

  order.items.forEach((item: any, i: number) => {
    msg += `  ${i + 1}. ${item.name}\n`;
    msg += `     ${item.quantity} x ${formatCurrency(item.price)} = ${formatCurrency(item.total)}\n`;
  });

  msg += `\n━━━━━━━━━━━━━━━━━━\n`;
  msg += `💰 TỔNG CỘNG: ${formatCurrency(order.totalAmount)}\n`;

  if (order.note) {
    msg += `\n📝 Ghi chú: ${order.note}\n`;
  }

  return msg;
}

function buildCustomerSummaryMessage(customer: any): string {
  let msg = `📊 BẢNG TỔNG HỢP KHÁCH HÀNG\n`;
  msg += `━━━━━━━━━━━━━━━━━━\n`;
  msg += `👤 ${customer.name}\n`;
  msg += `📱 SĐT: ${customer.phone}\n`;
  msg += `━━━━━━━━━━━━━━━━━━\n`;
  msg += `\n🧾 Các đơn hàng:\n`;

  customer.orders.forEach((order: any, i: number) => {
    msg += `  ${i + 1}. Đơn ${order.id.slice(-8).toUpperCase()} - ${formatCurrency(order.totalAmount)} (${new Date(order.createdAt).toLocaleDateString("vi-VN")})\n`;
  });

  msg += `\n━━━━━━━━━━━━━━━━━━\n`;
  msg += `📦 Tổng số đơn: ${customer.totalOrders}\n`;
  msg += `💰 Tổng tiền hàng: ${formatCurrency(customer.totalSpent)}\n`;

  return msg;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, customerId, toPhone } = body;

    if (!toPhone?.trim()) {
      return NextResponse.json({ error: "Vui lòng nhập SĐT Zalo nhận tin" }, { status: 400 });
    }

    let message: string;

    if (orderId) {
      // Send single order
      const order = await db.order.findUnique({
        where: { id: orderId },
        include: { customer: true, items: true },
      });
      if (!order) return NextResponse.json({ error: "Không tìm thấy đơn hàng" }, { status: 404 });

      message = buildOrderMessage(order);

      // Mark as sent
      await db.order.update({
        where: { id: orderId },
        data: { sentAt: new Date(), sentTo: toPhone.trim() },
      });
    } else if (customerId) {
      // Send customer summary
      const customer = await db.customer.findUnique({
        where: { id: customerId },
        include: { orders: { include: { items: true }, orderBy: { createdAt: "desc" } } },
      });
      if (!customer) return NextResponse.json({ error: "Không tìm thấy khách hàng" }, { status: 404 });

      const totalOrders = customer.orders.length;
      const totalSpent = customer.orders.reduce((s, o) => s + o.totalAmount, 0);

      message = buildCustomerSummaryMessage({
        ...customer,
        totalOrders,
        totalSpent,
      });
    } else {
      return NextResponse.json({ error: "Cần orderId hoặc customerId" }, { status: 400 });
    }

    // Send via Zalo bot
    const res = await fetch(`${ZALO_BOT_URL}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: toPhone.trim(), message }),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
