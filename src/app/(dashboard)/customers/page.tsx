import { requirePermission, hasPermission } from "@/lib/rbac";
import { CustomersTable } from "@/components/customers/customers-table";

export const metadata = { title: "Customers" };

export default async function CustomersPage() {
  await requirePermission("customers:view");
  const [canCreate, canUpdate, canDelete] = await Promise.all([
    hasPermission("customers:create"),
    hasPermission("customers:update"),
    hasPermission("customers:delete"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
        <p className="text-muted-foreground">Everyone who has purchased from your store.</p>
      </div>
      <CustomersTable canCreate={canCreate} canUpdate={canUpdate} canDelete={canDelete} />
    </div>
  );
}
