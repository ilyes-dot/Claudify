import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { createOrderSchema, orderListQuerySchema } from "@/lib/validations/order";
import { logAudit, getClientIp } from "@/lib/audit";
import { handleError } from "@/lib/api-errors";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    await requirePermission("orders:view");
    const query = orderListQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));

    const where: Prisma.OrderWhereInput = {
      ...(query.search && {
        OR: [
          { orderNumber: { contains: query.search, mode: "insensitive" } },
          { customer: { name: { contains: query.search, mode: "insensitive" } } },
          { customer: { email: { contains: query.search, mode: "insensitive" } } },
        ],
      }),
      ...(query.status && { status: query.status }),
    };

    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { customer: { select: { name: true, email: true } }, _count: { select: { items: true } } },
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({
      items,
      pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) },
    });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission("orders:create");
    const data = createOrderSchema.parse(await req.json());

    const products = await prisma.product.findMany({
      where: { id: { in: data.items.map((i) => i.productId) }, deletedAt: null },
    });
    if (products.length !== data.items.length) {
      return NextResponse.json({ error: "One or more selected products could not be found." }, { status: 400 });
    }

    for (const item of data.items) {
      const product = products.find((p) => p.id === item.productId)!;
      if (product.stock < item.quantity) {
        return NextResponse.json({ error: `Not enough stock for "${product.name}" (${product.stock} available).` }, { status: 400 });
      }
    }

    const subtotal = data.items.reduce((sum, item) => {
      const product = products.find((p) => p.id === item.productId)!;
      return sum + Number(product.price) * item.quantity;
    }, 0);
    const total = subtotal + data.shipping;
    const orderNumber = `ORD-${Date.now().toString().slice(-8)}`;

    // Create the order and decrement stock atomically — if either fails,
    // neither happens, so stock counts never drift from real orders.
    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber,
          customerId: data.customerId,
          subtotal,
          shipping: data.shipping,
          total,
          notes: data.notes,
          items: {
            create: data.items.map((item) => {
              const product = products.find((p) => p.id === item.productId)!;
              return {
                productId: product.id,
                nameSnapshot: product.name,
                priceSnapshot: product.price,
                quantity: item.quantity,
              };
            }),
          },
        },
        include: { customer: { select: { name: true, email: true } } },
      });

      for (const item of data.items) {
        await tx.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.quantity } } });
      }

      return created;
    });

    await logAudit({
      actorId: (session.user as any).id,
      action: "order.create",
      targetType: "Order",
      targetId: order.id,
      metadata: { orderNumber: order.orderNumber, total },
      ipAddress: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
    });

    return NextResponse.json({ order }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
