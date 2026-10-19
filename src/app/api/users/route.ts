import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { createUserSchema, userListQuerySchema } from "@/lib/validations/user";
import { logAudit, getClientIp } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { handleError } from "@/lib/api-errors";
import { notifyRole } from "@/lib/notify";
import { createInviteToken } from "@/lib/invite-token";
import { sendEmail, inviteEmailTemplate } from "@/lib/email";
import { Prisma } from "@prisma/client";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  try {
    await requirePermission("users:view");

    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const query = userListQuerySchema.parse(searchParams);

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: "insensitive" } },
          { email: { contains: query.search, mode: "insensitive" } },
        ],
      }),
      ...(query.roleId && { roleId: query.roleId }),
      ...(query.status && { status: query.status }),
    };

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
          role: { select: { id: true, name: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      items,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePermission("users:create");

    // Rate-limit user creation per admin to blunt scripted abuse.
    const rl = await rateLimit(`create-user:${(session.user as any).id}`, { limit: 20, windowMs: 60_000 });
    if (!rl.success) {
      return NextResponse.json({ error: "Too many requests. Slow down and try again shortly." }, { status: 429 });
    }

    const body = await req.json();
    const data = createUserSchema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      // Deliberately vague to avoid confirming account existence to an
      // unauthorized caller — but since this endpoint requires users:create,
      // a clearer message is acceptable here for legitimate admins.
      return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 });
    }

    // If the admin didn't set a temporary password, generate a random one
    // that is never revealed to anyone — the user will set their own via
    // the emailed invite link instead.
    const rawPassword = data.password || crypto.randomBytes(24).toString("hex");
    const passwordHash = await bcrypt.hash(rawPassword, 12);
    const sendInvite = !data.password;

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        roleId: data.roleId,
        status: data.status,
        passwordHash,
        mustChangePassword: true,
      },
      select: { id: true, name: true, email: true, status: true, role: { select: { name: true } } },
    });

    let inviteEmailSent = false;
    if (sendInvite) {
      try {
        const inviteToken = await createInviteToken(user.id);
        const inviteUrl = `${process.env.NEXTAUTH_URL}/invite/${inviteToken}`;
        await sendEmail({
          to: user.email,
          subject: "You've been invited to Shop Admin Panel",
          html: inviteEmailTemplate({ name: user.name, inviteUrl }),
        });
        inviteEmailSent = true;
      } catch (err) {
        // Don't fail user creation just because email delivery failed —
        // the admin can still see the user was created and can be told
        // to set a password some other way.
        console.error("[api/users] failed to send invite email:", err);
      }
    }

    await logAudit({
      actorId: (session.user as any).id,
      action: "user.create",
      targetType: "User",
      targetId: user.id,
      metadata: { email: user.email, role: user.role.name },
      ipAddress: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
    });

    await notifyRole("Super Admin", {
      title: "New user created",
      body: `${user.name} (${user.email}) was added as ${user.role.name}.`,
      type: "INFO",
    });

    return NextResponse.json({ user, inviteEmailSent }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}

