import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { updateProductSchema } from "@/lib/validations/product";
import { logAudit, getClientIp } from "@/lib/audit";
import { handleError } from "@/lib/api-errors";

interface Params { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requirePermission("products:view");
    const product = await prisma.product.findFirst({
      where: { id: params.id, deletedAt: null },
      include: { category: { select: { id: true, name: true } } },
    });
    if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });
    return NextResponse.json({ product });
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requirePermission("products:update");
    const data = updateProductSchema.parse(await req.json());

    const before = await prisma.product.findFirst({ where: { id: params.id, deletedAt: null } });
    if (!before) return NextResponse.json({ error: "Product not found." }, { status: 404 });

    if (data.slug && data.slug !== before.slug) {
      const existing = await prisma.product.findUnique({ where: { slug: data.slug } });
      if (existing) return NextResponse.json({ error: "A product with this slug already exists." }, { status: 409 });
    }

    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        ...data,
        categoryId: data.categoryId === "" ? null : data.categoryId,
        imageUrl: data.imageUrl === "" ? null : data.imageUrl,
      },
      include: { category: { select: { name: true } } },
    });

    await logAudit({
      actorId: (session.user as any).id,
      action: "product.update",
      targetType: "Product",
      targetId: product.id,
      metadata: { before: { price: before.price, stock: before.stock, status: before.status }, after: data },
      ipAddress: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
    });

    return NextResponse.json({ product });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await requirePermission("products:delete");
    const product = await prisma.product.findFirst({ where: { id: params.id, deletedAt: null } });
    if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });

    // Soft delete — order history referencing this product must survive.
    await prisma.product.update({ where: { id: params.id }, data: { deletedAt: new Date(), status: "ARCHIVED" } });

    await logAudit({
      actorId: (session.user as any).id,
      action: "product.delete",
      targetType: "Product",
      targetId: params.id,
      metadata: { name: product.name },
      ipAddress: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
