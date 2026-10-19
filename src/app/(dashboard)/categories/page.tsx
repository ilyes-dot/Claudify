import { requirePermission, hasPermission } from "@/lib/rbac";
import { CategoriesManager } from "@/components/categories/categories-manager";

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  await requirePermission("categories:view");
  const [canCreate, canUpdate, canDelete] = await Promise.all([
    hasPermission("categories:create"),
    hasPermission("categories:update"),
    hasPermission("categories:delete"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
        <p className="text-muted-foreground">Organize your catalog into browsable groups.</p>
      </div>
      <CategoriesManager canCreate={canCreate} canUpdate={canUpdate} canDelete={canDelete} />
    </div>
  );
}
