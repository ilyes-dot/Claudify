import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/rbac";
import { handleError } from "@/lib/api-errors";

// Notifications are personal — every user (any role) can read their own,
// no special permission needed beyond being logged in.
export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const userId = (session.user as any).id;
    const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 20), 50);

    const [items, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.notification.count({ where: { userId, readAt: null } }),
    ]);

    return NextResponse.json({ items, unreadCount });
  } catch (err) {
    return handleError(err);
  }
}
