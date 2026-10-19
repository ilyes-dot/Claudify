import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { createCategorySchema } from "@/lib/validations/product";
import { logAudit, getClientIp } from "@/lib/audit";
import { handleError } from "@/lib/api-errors";

export async function GET() {
  try {
    await requirePermission("categories:view");
    const categories = await prisma.category.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    });
    return NextResponse.json({ categories });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission("categories:create");
    const data = createCategorySchema.parse(await req.json());

    const existing = await prisma.category.findFirst({ where: { OR: [{ name: data.name }, { slug: data.slug }] } });
    if (existing) return NextResponse.json({ error: "A category with this name or slug already exists." }, { status: 409 });

    const category = await prisma.category.create({ data });

    await logAudit({
      actorId: (session.user as any).id,
      action: "category.create",
      targetType: "Category",
      targetId: category.id,
      metadata: { name: category.name },
      ipAddress: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
