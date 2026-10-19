"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, Users as UsersIcon, Pencil, Trash2, MoreHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/users/confirm-dialog";
import { CustomerFormDialog } from "@/components/customers/customer-form-dialog";
import { getInitials } from "@/lib/utils";

interface CustomerRow {
  id: string; name: string; email: string; phone: string | null; city: string | null; country: string | null;
  _count: { orders: number };
}

const PAGE_SIZE = 10;

export function CustomersTable({ canCreate, canUpdate, canDelete }: { canCreate: boolean; canUpdate: boolean; canDelete: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerRow | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<CustomerRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["customers", { search, page }],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (search) params.set("search", search);
      const res = await fetch(`/api/customers?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load customers.");
      return res.json() as Promise<{ items: CustomerRow[]; pagination: { total: number; totalPages: number } }>;
    },
  });

  const handleDelete = async () => {
    if (!deletingCustomer) return;
    try {
      const res = await fetch(`/api/customers/${deletingCustomer.id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to delete customer.");
      toast({ title: "Customer deleted", variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    } finally {
      setDeletingCustomer(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search name or email…" className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        {canCreate && <Button onClick={() => { setEditingCustomer(null); setFormOpen(true); }}><Plus className="h-4 w-4" /> Add customer</Button>}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Orders</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>{Array.from({ length: 5 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
          ))}

          {!isLoading && data?.items.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-14 text-center">
                <UsersIcon className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="font-medium">No customers found</p>
              </TableCell>
            </TableRow>
          )}

          {data?.items.map((customer) => (
            <TableRow key={customer.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {getInitials(customer.name)}
                  </div>
                  {customer.name}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{customer.email}</TableCell>
              <TableCell className="text-muted-foreground">{[customer.city, customer.country].filter(Boolean).join(", ") || "—"}</TableCell>
              <TableCell><Badge variant="secondary">{customer._count.orders}</Badge></TableCell>
              <TableCell className="text-right">
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <Button variant="ghost" size="icon" aria-label={`Actions for ${customer.name}`}><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content align="end" className="z-50 w-40 rounded-md border bg-popover p-1 shadow-md">
                      {canUpdate && (
                        <DropdownMenu.Item onSelect={() => { setEditingCustomer(customer); setFormOpen(true); }}
                          className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent">
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </DropdownMenu.Item>
                      )}
                      {canDelete && (
                        <DropdownMenu.Item onSelect={() => setDeletingCustomer(customer)}
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

      <CustomerFormDialog
        open={formOpen} onOpenChange={setFormOpen} editingCustomer={editingCustomer}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["customers"] })}
      />

      <ConfirmDialog
        open={!!deletingCustomer} onOpenChange={(open) => !open && setDeletingCustomer(null)}
        title="Delete customer?" description={`"${deletingCustomer?.name}" will be removed. Their past orders are preserved.`}
        confirmLabel="Delete customer" variant="destructive" onConfirm={handleDelete}
      />
    </div>
  );
}
