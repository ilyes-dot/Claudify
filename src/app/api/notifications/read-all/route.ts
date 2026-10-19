import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/rbac";
import { handleError } from "@/lib/api-errors";

export async function POST() {
  try {
    const session = await getCurrentSession();
    if (!session?.user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    const userId = (session.user as any).id;
    await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleError(err);
  }
}
