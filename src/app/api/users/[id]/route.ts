import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { updateUserSchema } from "@/lib/validations/user";
import { logAudit, getClientIp } from "@/lib/audit";
import { handleError } from "@/lib/api-errors";
import { notify } from "@/lib/notify";

interface Params {
  params: { id: string };
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requirePermission("users:view");
    const user = await prisma.user.findFirst({
      where: { id: params.id, deletedAt: null },
      select: {
        id: true, name: true, email: true, status: true, roleId: true,
        lastLoginAt: true, createdAt: true, twoFactorEnabled: true,
        role: { select: { id: true, name: true } },
      },
    });
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
    return NextResponse.json({ user });
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await requirePermission("users:update");
    const body = await req.json();
    const data = updateUserSchema.parse(body);

    const before = await prisma.user.findUnique({ where: { id: params.id } });
    if (!before || before.deletedAt) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Prevent an admin from demoting/suspending their own last-standing
    // Super Admin account and locking everyone out — a common real-world
    // footgun in RBAC systems.
    const actingUserId = (session.user as any).id;
    if (before.id === actingUserId && data.status && data.status !== "ACTIVE") {
      return NextResponse.json({ error: "You cannot suspend or disable your own account." }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data,
      select: { id: true, name: true, email: true, status: true, role: { select: { name: true } } },
    });

    await logAudit({
      actorId: actingUserId,
      action: "user.update",
      targetType: "User",
      targetId: user.id,
      metadata: { before: { status: before.status, roleId: before.roleId }, after: data },
      ipAddress: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
    });

    // Let the affected user know something about their account changed —
    // skip notifying yourself when an admin edits their own profile.
    if (user.id !== actingUserId) {
      if (data.status === "SUSPENDED" || data.status === "DISABLED") {
        await notify({
          userId: user.id,
          title: "Your account access was changed",
          body: `Your account status is now ${data.status}. Contact an administrator if this is unexpected.`,
          type: "WARNING",
        });
      } else if (data.roleId && data.roleId !== before.roleId) {
        await notify({
          userId: user.id,
          title: "Your role was updated",
          body: `You are now assigned the "${user.role.name}" role.`,
          type: "INFO",
        });
      }
    }

    return NextResponse.json({ user });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await requirePermission("users:delete");
    const actingUserId = (session.user as any).id;

    if (params.id === actingUserId) {
      return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
    }

    const user = await prisma.user.findFirst({ where: { id: params.id, deletedAt: null } });
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

    // Soft delete — preserves referential integrity for audit logs and
    // satisfies "right to be forgotten" workflows without losing history.
    await prisma.user.update({
      where: { id: params.id },
      data: { deletedAt: new Date(), status: "DISABLED" },
    });

    await logAudit({
      actorId: actingUserId,
      action: "user.delete",
      targetType: "User",
      targetId: params.id,
      metadata: { email: user.email },
      ipAddress: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
