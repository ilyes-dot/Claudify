import { requirePermission } from "@/lib/rbac";
import { AuditLogTable } from "@/components/audit/audit-log-table";

export const metadata = { title: "Audit Logs" };

export default async function AuditLogsPage() {
  await requirePermission("audit-logs:view");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-muted-foreground">Immutable record of every sensitive action taken in this panel.</p>
      </div>
      <AuditLogTable />
    </div>
  );
}
