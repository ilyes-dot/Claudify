import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { updateOrderStatusSchema } from "@/lib/validations/order";
import { logAudit, getClientIp } from "@/lib/audit";
import { handleError } from "@/lib/api-errors";

interface Params { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requirePermission("orders:view");
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        items: { include: { product: { select: { name: true, imageUrl: true } } } },
      },
    });
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    return NextResponse.json({ order });
  } catch (err) {
    return handleError(err);
  }
}

// Valid forward-only transitions — prevents nonsensical jumps like
// DELIVERED → PENDING from the UI. CANCELLED/REFUNDED are terminal states
// reachable from most other states, but never reversible from here.
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["PAID", "CANCELLED"],
  PAID: ["SHIPPED", "CANCELLED", "REFUNDED"],
  SHIPPED: ["DELIVERED", "REFUNDED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requirePermission("orders:update");
    const { status } = updateOrderStatusSchema.parse(await req.json());

    const order = await prisma.order.findUnique({ where: { id: params.id }, include: { items: true } });
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

    if (status !== order.status && !ALLOWED_TRANSITIONS[order.status]?.includes(status)) {
      return NextResponse.json(
        { error: `Cannot change status from ${order.status} to ${status}.` },
        { status: 400 }
      );
    }

    // Restore stock if an order is cancelled or refunded after being placed.
    const restockStatuses = ["CANCELLED", "REFUNDED"];
    const shouldRestock = restockStatuses.includes(status) && !restockStatuses.includes(order.status);

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.order.update({
        where: { id: params.id },
        data: { status },
        include: { customer: { select: { name: true, email: true } } },
      });

      if (shouldRestock) {
        for (const item of order.items) {
          if (item.productId) {
            await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
          }
        }
      }

      return result;
    });

    await logAudit({
      actorId: (session.user as any).id,
      action: "order.status_update",
      targetType: "Order",
      targetId: order.id,
      metadata: { from: order.status, to: status },
      ipAddress: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
    });

    return NextResponse.json({ order: updated });
  } catch (err) {
    return handleError(err);
  }
}
