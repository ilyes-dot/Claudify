import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { logAudit, getClientIp } from "@/lib/audit";
import { handleError } from "@/lib/api-errors";
import { z } from "zod";

const MODULE_KEYS = ["module.users", "module.roles", "module.audit-logs", "module.notifications"] as const;

const updateSchema = z.object({
  key: z.enum(MODULE_KEYS),
  value: z.boolean(),
});

export async function GET() {
  try {
    await requirePermission("settings:view");
    const rows = await prisma.systemSetting.findMany({ where: { key: { in: MODULE_KEYS as unknown as string[] } } });
    const settings: Record<string, boolean> = Object.fromEntries(MODULE_KEYS.map((k) => [k, true]));
    for (const row of rows) settings[row.key] = row.value as boolean;
    return NextResponse.json({ settings });
  } catch (err) {
    return handleError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requirePermission("settings:update");
    const { key, value } = updateSchema.parse(await req.json());

    await prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value, description: `Toggles the ${key.replace("module.", "")} module.` },
    });

    await logAudit({
      actorId: (session.user as any).id,
      action: "settings.update",
      targetType: "SystemSetting",
      targetId: key,
      metadata: { key, value },
      ipAddress: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
