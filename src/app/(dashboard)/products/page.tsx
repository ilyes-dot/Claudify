import { requirePermission, hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { ProductsTable } from "@/components/products/products-table";

export const metadata = { title: "Products" };

export default async function ProductsPage() {
  await requirePermission("products:view");

  const [categories, canCreate, canUpdate, canDelete] = await Promise.all([
    prisma.category.findMany({ where: { deletedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    hasPermission("products:create"),
    hasPermission("products:update"),
    hasPermission("products:delete"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Products</h1>
        <p className="text-muted-foreground">Manage your catalog, pricing, and stock levels.</p>
      </div>
      <ProductsTable categories={categories} canCreate={canCreate} canUpdate={canUpdate} canDelete={canDelete} />
    </div>
  );
}
