import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { updateCustomerSchema } from "@/lib/validations/customer";
import { logAudit, getClientIp } from "@/lib/audit";
import { handleError } from "@/lib/api-errors";

interface Params { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requirePermission("customers:view");
    const customer = await prisma.customer.findFirst({
      where: { id: params.id, deletedAt: null },
      include: { orders: { orderBy: { createdAt: "desc" }, take: 10 } },
    });
    if (!customer) return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    return NextResponse.json({ customer });
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requirePermission("customers:update");
    const data = updateCustomerSchema.parse(await req.json());

    const customer = await prisma.customer.findFirst({ where: { id: params.id, deletedAt: null } });
    if (!customer) return NextResponse.json({ error: "Customer not found." }, { status: 404 });

    const updated = await prisma.customer.update({ where: { id: params.id }, data });

    await logAudit({
      actorId: (session.user as any).id,
      action: "customer.update",
      targetType: "Customer",
      targetId: customer.id,
      ipAddress: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
    });

    return NextResponse.json({ customer: updated });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await requirePermission("customers:delete");
    const customer = await prisma.customer.findFirst({ where: { id: params.id, deletedAt: null } });
    if (!customer) return NextResponse.json({ error: "Customer not found." }, { status: 404 });

    await prisma.customer.update({ where: { id: params.id }, data: { deletedAt: new Date() } });

    await logAudit({
      actorId: (session.user as any).id,
      action: "customer.delete",
      targetType: "Customer",
      targetId: params.id,
      metadata: { email: customer.email },
      ipAddress: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
