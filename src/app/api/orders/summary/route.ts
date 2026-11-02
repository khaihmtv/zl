import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/orders/summary - Customer summary with totals
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get("phone") || "";

    const customers = await db.customer.findMany({
      where: phone ? { phone: { contains: phone } } : undefined,
      include: {
        orders: {
          include: { items: true },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const summary = customers.map((c) => {
      const totalOrders = c.orders.length;
      const totalSpent = c.orders.reduce((s, o) => s + o.totalAmount, 0);
      const lastOrder = c.orders[0] || null;
      return {
        id: c.id,
        phone: c.phone,
        name: c.name,
        note: c.note,
        totalOrders,
        totalSpent,
        lastOrderDate: lastOrder?.createdAt || null,
        lastOrderAmount: lastOrder?.totalAmount || 0,
      };
    });

    // Grand totals
    const allOrders = await db.order.findMany();
    const grandTotal = allOrders.reduce((s, o) => s + o.totalAmount, 0);

    return NextResponse.json({ customers: summary, grandTotal, totalCustomers: summary.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
