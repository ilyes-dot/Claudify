import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/rbac";
import { handleError } from "@/lib/api-errors";

interface Params { params: { id: string } }

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const session = await getCurrentSession();
    if (!session?.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const userId = (session.user as any).id;

    // Scope the update to this user's own notifications — prevents one
    // user from marking another user's notification as read by guessing
    // its id.
    const result = await prisma.notification.updateMany({
      where: { id: params.id, userId, readAt: null },
      data: { readAt: new Date() },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Notification not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
