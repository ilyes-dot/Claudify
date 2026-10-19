import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export type PermissionKey = `${string}:${"view" | "create" | "update" | "delete"}`;

export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message = "Authentication required.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Server-side guard: throws UnauthorizedError if not logged in, or
 * ForbiddenError if the current user's role lacks the given permission(s).
 * Use inside API route handlers and Server Components/Actions.
 *
 *   const session = await requirePermission("users:delete");
 */
export async function requirePermission(...required: PermissionKey[]) {
  const session = await getServerSession(authOptions);

  if (!session?.user || (session.user as any).invalid) {
    throw new UnauthorizedError();
  }

  const permissions: string[] = (session.user as any).permissions ?? [];
  const hasAll = required.every((perm) => permissions.includes(perm));

  if (!hasAll) {
    throw new ForbiddenError();
  }

  return session;
}

/** Non-throwing variant for conditional UI rendering in Server Components. */
export async function hasPermission(...required: PermissionKey[]): Promise<boolean> {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).invalid) return false;
  const permissions: string[] = (session.user as any).permissions ?? [];
  return required.every((perm) => permissions.includes(perm));
}

/** Convenience getter for the current session, or null. */
export async function getCurrentSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).invalid) return null;
  return session;
}
