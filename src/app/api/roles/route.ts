import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { logAudit, getClientIp } from "@/lib/audit";
import { handleError } from "@/lib/api-errors";
import { z } from "zod";

const createRoleSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(300).optional(),
  permissionKeys: z.array(z.string()).default([]),
});

export async function GET() {
  try {
    await requirePermission("roles:view");
    const roles = await prisma.role.findMany({
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
      orderBy: { name: "asc" },
    });
    const permissions = await prisma.permission.findMany({ orderBy: [{ module: "asc" }, { action: "asc" }] });
    return NextResponse.json({ roles, permissions });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission("roles:create");
    const data = createRoleSchema.parse(await req.json());

    const role = await prisma.role.create({
      data: {
        name: data.name,
        description: data.description,
        permissions: {
          create: (
            await prisma.permission.findMany({ where: { key: { in: data.permissionKeys } } })
          ).map((p) => ({ permissionId: p.id })),
        },
      },
    });

    await logAudit({
      actorId: (session.user as any).id,
      action: "role.create",
      targetType: "Role",
      targetId: role.id,
      metadata: { name: role.name, permissionKeys: data.permissionKeys },
      ipAddress: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
    });

    return NextResponse.json({ role }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
