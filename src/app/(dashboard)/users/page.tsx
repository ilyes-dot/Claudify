import { requirePermission, hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { UsersTable } from "@/components/users/users-table";

export const metadata = { title: "Users" };

export default async function UsersPage() {
  await requirePermission("users:view");

  const [roles, canCreate, canUpdate, canDelete] = await Promise.all([
    prisma.role.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    hasPermission("users:create"),
    hasPermission("users:update"),
    hasPermission("users:delete"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">Manage accounts, roles, and access status.</p>
        </div>
      </div>
      <UsersTable roles={roles} canCreate={canCreate} canUpdate={canUpdate} canDelete={canDelete} />
    </div>
  );
}
