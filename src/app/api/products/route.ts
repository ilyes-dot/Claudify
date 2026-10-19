import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { createProductSchema, productListQuerySchema } from "@/lib/validations/product";
import { logAudit, getClientIp } from "@/lib/audit";
import { handleError } from "@/lib/api-errors";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    await requirePermission("products:view");
    const query = productListQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));

    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: "insensitive" } },
          { sku: { contains: query.search, mode: "insensitive" } },
        ],
      }),
      ...(query.categoryId && { categoryId: query.categoryId }),
      ...(query.status && { status: query.status }),
    };

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { category: { select: { id: true, name: true } } },
      }),
      prisma.product.count({ where }),
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
    const session = await requirePermission("products:create");
    const data = createProductSchema.parse(await req.json());

    const existingSlug = await prisma.product.findUnique({ where: { slug: data.slug } });
    if (existingSlug) return NextResponse.json({ error: "A product with this slug already exists." }, { status: 409 });

    if (data.sku) {
      const existingSku = await prisma.product.findUnique({ where: { sku: data.sku } });
      if (existingSku) return NextResponse.json({ error: "A product with this SKU already exists." }, { status: 409 });
    }

    const product = await prisma.product.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        sku: data.sku || undefined,
        price: data.price,
        compareAtPrice: data.compareAtPrice ?? undefined,
        stock: data.stock,
        status: data.status,
        categoryId: data.categoryId || undefined,
        imageUrl: data.imageUrl || undefined,
      },
      include: { category: { select: { name: true } } },
    });

    await logAudit({
      actorId: (session.user as any).id,
      action: "product.create",
      targetType: "Product",
      targetId: product.id,
      metadata: { name: product.name, price: data.price },
      ipAddress: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
