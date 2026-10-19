import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { createCustomerSchema, customerListQuerySchema } from "@/lib/validations/customer";
import { logAudit, getClientIp } from "@/lib/audit";
import { handleError } from "@/lib/api-errors";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    await requirePermission("customers:view");
    const query = customerListQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));

    const where: Prisma.CustomerWhereInput = {
      deletedAt: null,
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: "insensitive" } },
          { email: { contains: query.search, mode: "insensitive" } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { _count: { select: { orders: true } } },
      }),
      prisma.customer.count({ where }),
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
    const session = await requirePermission("customers:create");
    const data = createCustomerSchema.parse(await req.json());

    const existing = await prisma.customer.findUnique({ where: { email: data.email } });
    if (existing) return NextResponse.json({ error: "A customer with this email already exists." }, { status: 409 });

    const customer = await prisma.customer.create({ data });

    await logAudit({
      actorId: (session.user as any).id,
      action: "customer.create",
      targetType: "Customer",
      targetId: customer.id,
      metadata: { email: customer.email },
      ipAddress: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
