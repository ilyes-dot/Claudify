import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/rbac";
import { changePasswordSchema } from "@/lib/validations/user";
import { logAudit, getClientIp } from "@/lib/audit";
import { handleError } from "@/lib/api-errors";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const userId = (session.user as any).id;

    const rl = await rateLimit(`change-password:${userId}`, { limit: 5, windowMs: 15 * 60_000 });
    if (!rl.success) {
      return NextResponse.json({ error: "Too many attempts. Try again in a few minutes." }, { status: 429 });
    }

    const data = changePasswordSchema.parse(await req.json());
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

    const valid = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!valid) {
      await logAudit({ actorId: userId, action: "auth.change_password_failed" });
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
    }

    // Prevent re-using the same password.
    const sameAsOld = await bcrypt.compare(data.newPassword, user.passwordHash);
    if (sameAsOld) {
      return NextResponse.json({ error: "New password must be different from your current password." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(data.newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: false, passwordChangedAt: new Date() },
    });

    await logAudit({
      actorId: userId,
      action: "auth.change_password_success",
      ipAddress: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
