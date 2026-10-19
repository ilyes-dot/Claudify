import { requirePermission, hasPermission } from "@/lib/rbac";
import { SettingsPanel } from "@/components/settings/settings-panel";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requirePermission("settings:view");
  const canEdit = await hasPermission("settings:update");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Configure which modules are available in this deployment.</p>
      </div>
      <SettingsPanel canEdit={canEdit} />
    </div>
  );
}
