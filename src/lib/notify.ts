import { prisma } from "@/lib/prisma";

interface NotifyInput {
  userId: string;
  title: string;
  body?: string;
  type?: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
}

/**
 * Creates an in-app notification for a single user. Call this from any
 * server-side action where the recipient should see a bell-icon alert
 * (e.g. "your role was changed", "a new device signed in").
 * Failures are swallowed — notifications are a convenience, never allowed
 * to block the action that triggered them.
 */
export async function notify({ userId, title, body, type = "INFO" }: NotifyInput) {
  try {
    await prisma.notification.create({ data: { userId, title, body, type } });
  } catch (err) {
    console.error("[notify] failed to create notification:", err);
  }
}

/** Same as notify(), but fans out to every user holding a given role. */
export async function notifyRole(roleName: string, input: Omit<NotifyInput, "userId">) {
  try {
    const users = await prisma.user.findMany({
      where: { role: { name: roleName }, deletedAt: null, status: "ACTIVE" },
      select: { id: true },
    });
    await prisma.notification.createMany({
      data: users.map((u) => ({ userId: u.id, title: input.title, body: input.body, type: input.type ?? "INFO" })),
    });
  } catch (err) {
    console.error("[notify] failed to notify role:", err);
  }
}
