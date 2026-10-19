import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { handleError } from "@/lib/api-errors";
import { z } from "zod";

const querySchema = z.object({
  action: z.string().trim().optional(),
  actorId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(req: NextRequest) {
  try {
    await requirePermission("audit-logs:view");
    const query = querySchema.parse(Object.fromEntries(req.nextUrl.searchParams));

    const where = {
      ...(query.action && { action: { contains: query.action, mode: "insensitive" as const } }),
      ...(query.actorId && { actorId: query.actorId }),
    };

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { actor: { select: { name: true, email: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      items,
      pagination: { page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) },
    });
  } catch (err) {
    return handleError(err);
  }
}
