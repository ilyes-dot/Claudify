import { requirePermission, hasPermission } from "@/lib/rbac";
import { OrdersTable } from "@/components/orders/orders-table";

export const metadata = { title: "Orders" };

export default async function OrdersPage() {
  await requirePermission("orders:view");
  const canUpdate = await hasPermission("orders:update");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
        <p className="text-muted-foreground">Track and manage customer orders.</p>
      </div>
      <OrdersTable canUpdate={canUpdate} />
    </div>
  );
}
