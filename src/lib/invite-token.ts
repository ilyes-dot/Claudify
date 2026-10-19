import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const TOKEN_BYTES = 32;
const EXPIRY_HOURS = 24;

/** SHA-256 hash — we only ever store the hash, never the raw token, same principle as password storage. */
function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Creates a new invite token for a user and returns the RAW token (only
 * this one time — it's never retrievable again, only its hash is stored).
 * Embed the raw token in the emailed URL.
 */
export async function createInviteToken(userId: string): Promise<string> {
  const rawToken = crypto.randomBytes(TOKEN_BYTES).toString("hex");
  const tokenHash = hashToken(rawToken);

  // Invalidate any previous unused invites for this user so only the
  // newest email link works — prevents an old, possibly-leaked link
  // from still being valid.
  await prisma.inviteToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });

  await prisma.inviteToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + EXPIRY_HOURS * 60 * 60 * 1000),
    },
  });

  return rawToken;
}

/** Validates a raw token from the URL. Returns the associated userId, or null if invalid/expired/used. */
export async function verifyInviteToken(rawToken: string): Promise<{ userId: string } | null> {
  const tokenHash = hashToken(rawToken);

  const invite = await prisma.inviteToken.findUnique({ where: { tokenHash } });
  if (!invite) return null;
  if (invite.usedAt) return null;
  if (invite.expiresAt < new Date()) return null;

  return { userId: invite.userId };
}

/** Marks a token as consumed — call this after the user successfully sets their password. */
export async function consumeInviteToken(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  await prisma.inviteToken.updateMany({
    where: { tokenHash, usedAt: null },
    data: { usedAt: new Date() },
  });
}
