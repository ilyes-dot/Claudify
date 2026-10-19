"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, ArrowUpDown, MoreHorizontal, PackageX, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useToast } from "@/components/ui/toast";
import { ProductFormDialog } from "@/components/products/product-form-dialog";
import { ConfirmDialog } from "@/components/users/confirm-dialog";

interface Category { id: string; name: string }
interface ProductRow {
  id: string; name: string; sku: string | null; price: string; stock: number;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED"; category: { id: string; name: string } | null;
}

const STATUS_VARIANT: Record<ProductRow["status"], "success" | "secondary" | "outline"> = {
  ACTIVE: "success", DRAFT: "secondary", ARCHIVED: "outline",
};

const PAGE_SIZE = 10;

export function ProductsTable({
  categories, canCreate, canUpdate, canDelete,
}: { categories: Category[]; canCreate: boolean; canUpdate: boolean; canDelete: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "price" | "stock" | "createdAt">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<ProductRow | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["products", { search, categoryFilter, statusFilter, sortBy, sortOrder, page }],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE), sortBy, sortOrder });
      if (search) params.set("search", search);
      if (categoryFilter !== "all") params.set("categoryId", categoryFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/products?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load products.");
      return res.json() as Promise<{ items: ProductRow[]; pagination: { total: number; totalPages: number } }>;
    },
  });

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else { setSortBy(field); setSortOrder("asc"); }
    setPage(1);
  };

  const handleDelete = async () => {
    if (!deletingProduct) return;
    try {
      const res = await fetch(`/api/products/${deletingProduct.id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to delete product.");
      toast({ title: "Product deleted", description: `${deletingProduct.name} was archived.`, variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    } finally {
      setDeletingProduct(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search name or SKU…" className="pl-9" value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }} aria-label="Search products" />
          </div>
          <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="ARCHIVED">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {canCreate && (
          <Button onClick={() => { setEditingProduct(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" /> Add product
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("name")}>
                Product <ArrowUpDown className="h-3 w-3" />
              </button>
            </TableHead>
            <TableHead>Category</TableHead>
            <TableHead>
              <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("price")}>
                Price <ArrowUpDown className="h-3 w-3" />
              </button>
            </TableHead>
            <TableHead>
              <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("stock")}>
                Stock <ArrowUpDown className="h-3 w-3" />
              </button>
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>{Array.from({ length: 6 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
          ))}

          {isError && (
            <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-destructive">Failed to load products.</TableCell></TableRow>
          )}

          {!isLoading && !isError && data?.items.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-14 text-center">
                <PackageX className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="font-medium">No products found</p>
                <p className="text-sm text-muted-foreground">Try adjusting your search or filters.</p>
              </TableCell>
            </TableRow>
          )}

          {data?.items.map((product) => (
            <TableRow key={product.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{product.name}</p>
                  {product.sku && <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{product.category?.name ?? "—"}</TableCell>
              <TableCell>${Number(product.price).toFixed(2)}</TableCell>
              <TableCell className={product.stock === 0 ? "text-destructive" : product.stock < 10 ? "text-warning" : ""}>
                {product.stock}
              </TableCell>
              <TableCell><Badge variant={STATUS_VARIANT[product.status]}>{product.status}</Badge></TableCell>
              <TableCell className="text-right">
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <Button variant="ghost" size="icon" aria-label={`Actions for ${product.name}`}><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content align="end" className="z-50 w-40 rounded-md border bg-popover p-1 shadow-md">
                      {canUpdate && (
                        <DropdownMenu.Item onSelect={() => { setEditingProduct(product); setFormOpen(true); }}
                          className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent">
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </DropdownMenu.Item>
                      )}
                      {canDelete && (
                        <DropdownMenu.Item onSelect={() => setDeletingProduct(product)}
                          className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </DropdownMenu.Item>
                      )}
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {page} of {data.pagination.totalPages} · {data.pagination.total} total</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= data.pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}

      <ProductFormDialog
        open={formOpen} onOpenChange={setFormOpen} categories={categories} editingProduct={editingProduct}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["products"] })}
      />

      <ConfirmDialog
        open={!!deletingProduct} onOpenChange={(open) => !open && setDeletingProduct(null)}
        title="Delete product?" description={`"${deletingProduct?.name}" will be archived and hidden from the catalog. Past orders referencing it are preserved.`}
        confirmLabel="Delete product" variant="destructive" onConfirm={handleDelete}
      />
    </div>
  );
}
