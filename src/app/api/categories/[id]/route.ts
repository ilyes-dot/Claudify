import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { updateCategorySchema } from "@/lib/validations/product";
import { logAudit, getClientIp } from "@/lib/audit";
import { handleError } from "@/lib/api-errors";

interface Params { params: { id: string } }

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requirePermission("categories:update");
    const data = updateCategorySchema.parse(await req.json());

    const category = await prisma.category.findFirst({ where: { id: params.id, deletedAt: null } });
    if (!category) return NextResponse.json({ error: "Category not found." }, { status: 404 });

    const updated = await prisma.category.update({ where: { id: params.id }, data });

    await logAudit({
      actorId: (session.user as any).id,
      action: "category.update",
      targetType: "Category",
      targetId: category.id,
      metadata: { name: updated.name },
      ipAddress: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
    });

    return NextResponse.json({ category: updated });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await requirePermission("categories:delete");
    const category = await prisma.category.findFirst({
      where: { id: params.id, deletedAt: null },
      include: { _count: { select: { products: true } } },
    });
    if (!category) return NextResponse.json({ error: "Category not found." }, { status: 404 });

    if (category._count.products > 0) {
      return NextResponse.json(
        { error: `Cannot delete a category with ${category._count.products} product(s). Reassign them first.` },
        { status: 400 }
      );
    }

    await prisma.category.update({ where: { id: params.id }, data: { deletedAt: new Date() } });

    await logAudit({
      actorId: (session.user as any).id,
      action: "category.delete",
      targetType: "Category",
      targetId: params.id,
      metadata: { name: category.name },
      ipAddress: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
