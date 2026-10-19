import { requirePermission, hasPermission } from "@/lib/rbac";
import { RolesManager } from "@/components/roles/roles-manager";

export const metadata = { title: "Roles & Permissions" };

export default async function RolesPage() {
  await requirePermission("roles:view");
  const canEdit = await hasPermission("roles:update");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Roles & Permissions</h1>
        <p className="text-muted-foreground">Define what each role can see and do across every module.</p>
      </div>
      <RolesManager canEdit={canEdit} />
    </div>
  );
}
