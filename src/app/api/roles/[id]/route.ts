import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { logAudit, getClientIp } from "@/lib/audit";
import { handleError } from "@/lib/api-errors";
import { z } from "zod";

const updateRoleSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  description: z.string().trim().max(300).optional(),
  permissionKeys: z.array(z.string()).optional(),
});

interface Params { params: { id: string } }

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requirePermission("roles:update");
    const data = updateRoleSchema.parse(await req.json());

    const role = await prisma.role.findUnique({ where: { id: params.id } });
    if (!role) return NextResponse.json({ error: "Role not found." }, { status: 404 });

    if (role.isSystem && data.permissionKeys) {
      // System roles (Super Admin, Editor, Viewer) ship with the product;
      // allow renaming/describing but not rewriting their permission set,
      // to avoid an admin accidentally locking themselves out.
      return NextResponse.json(
        { error: "System role permissions cannot be modified. Create a custom role instead." },
        { status: 400 }
      );
    }

    const updated = await prisma.role.update({
      where: { id: params.id },
      data: {
        name: data.name,
        description: data.description,
        ...(data.permissionKeys && {
          permissions: {
            deleteMany: {},
            create: (
              await prisma.permission.findMany({ where: { key: { in: data.permissionKeys } } })
            ).map((p) => ({ permissionId: p.id })),
          },
        }),
      },
    });

    await logAudit({
      actorId: (session.user as any).id,
      action: "role.update",
      targetType: "Role",
      targetId: role.id,
      metadata: { name: updated.name, permissionKeys: data.permissionKeys },
      ipAddress: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
    });

    return NextResponse.json({ role: updated });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await requirePermission("roles:delete");
    const role = await prisma.role.findUnique({ where: { id: params.id }, include: { _count: { select: { users: true } } } });

    if (!role) return NextResponse.json({ error: "Role not found." }, { status: 404 });
    if (role.isSystem) return NextResponse.json({ error: "System roles cannot be deleted." }, { status: 400 });
    if (role._count.users > 0) {
      return NextResponse.json(
        { error: `Cannot delete a role with ${role._count.users} assigned user(s). Reassign them first.` },
        { status: 400 }
      );
    }

    await prisma.role.delete({ where: { id: params.id } });

    await logAudit({
      actorId: (session.user as any).id,
      action: "role.delete",
      targetType: "Role",
      targetId: params.id,
      metadata: { name: role.name },
      ipAddress: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
