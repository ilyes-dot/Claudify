import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { verifyInviteToken, consumeInviteToken } from "@/lib/invite-token";
import { passwordSchema } from "@/lib/validations/user";
import { logAudit, getClientIp } from "@/lib/audit";
import { handleError } from "@/lib/api-errors";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const acceptSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

// Public route — no session required, since a brand-new invited user has
// no account to be logged into yet. Security comes entirely from the
// single-use, short-lived, hashed token, not from auth.
export async function POST(req: NextRequest) {
  try {
    // Rate-limit by IP to blunt brute-forcing of invite tokens.
    const ip = getClientIp(req) ?? "unknown";
    const rl = await rateLimit(`invite-accept:${ip}`, { limit: 10, windowMs: 60_000 });
    if (!rl.success) {
      return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
    }

    const { token, password } = acceptSchema.parse(await req.json());

    const verified = await verifyInviteToken(token);
    if (!verified) {
      return NextResponse.json({ error: "This invite link is invalid or has expired." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: verified.userId },
      data: { passwordHash, mustChangePassword: false, status: "ACTIVE", passwordChangedAt: new Date() },
    });

    await consumeInviteToken(token);

    await logAudit({
      actorId: verified.userId,
      action: "invite.accepted",
      ipAddress: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
