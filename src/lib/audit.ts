import { prisma } from "@/lib/prisma";

interface AuditEntry {
  actorId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Writes an immutable audit trail entry. Never pass secrets (passwords,
 * tokens, full card numbers) into `metadata` — it is stored as plain JSON.
 * Failures here are swallowed (logged to stderr) so a logging outage never
 * blocks the actual business operation.
 */
export async function logAudit(entry: AuditEntry) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        metadata: entry.metadata as any,
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent ?? null,
      },
    });
  } catch (err) {
    console.error("[audit] failed to write audit log:", err);
  }
}

/** Extracts a best-effort client IP from a Next.js Request, respecting proxies. */
export function getClientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return req.headers.get("x-real-ip");
}
