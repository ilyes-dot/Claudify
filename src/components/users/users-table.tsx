"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, ArrowUpDown, MoreHorizontal, UserX, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useToast } from "@/components/ui/toast";
import { UserFormDialog } from "@/components/users/user-form-dialog";
import { ConfirmDialog } from "@/components/users/confirm-dialog";
import { formatDistanceToNow } from "date-fns";
import { getInitials } from "@/lib/utils";

interface Role {
  id: string;
  name: string;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  status: "ACTIVE" | "INVITED" | "SUSPENDED" | "DISABLED";
  lastLoginAt: string | null;
  createdAt: string;
  role: { id: string; name: string };
}

const STATUS_VARIANT: Record<UserRow["status"], "success" | "secondary" | "warning" | "destructive"> = {
  ACTIVE: "success",
  INVITED: "secondary",
  SUSPENDED: "warning",
  DISABLED: "destructive",
};

const PAGE_SIZE = 10;

export function UsersTable({
  roles,
  canCreate,
  canUpdate,
  canDelete,
}: {
  roles: Role[];
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "email" | "createdAt" | "lastLoginAt">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserRow | null>(null);

  const queryKey = ["users", { search, roleFilter, statusFilter, sortBy, sortOrder, page }];

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        sortBy,
        sortOrder,
      });
      if (search) params.set("search", search);
      if (roleFilter !== "all") params.set("roleId", roleFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/users?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load users.");
      return res.json() as Promise<{ items: UserRow[]; pagination: { total: number; totalPages: number } }>;
    },
  });

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    try {
      const res = await fetch(`/api/users/${deletingUser.id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to delete user.");
      toast({ title: "User deleted", description: `${deletingUser.name} has been removed.`, variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    } finally {
      setDeletingUser(null);
    }
  };

  const columns = useMemo(
    () => [
      { key: "name" as const, label: "Name" },
      { key: "email" as const, label: "Email" },
      { key: "createdAt" as const, label: "Created" },
      { key: "lastLoginAt" as const, label: "Last login" },
    ],
    []
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name or email…"
              className="pl-9"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              aria-label="Search users"
            />
          </div>
          <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {roles.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="INVITED">Invited</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
              <SelectItem value="DISABLED">Disabled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {canCreate && (
          <Button onClick={() => { setEditingUser(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" /> Add user
          </Button>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.key}>
                <button
                  className="flex items-center gap-1 hover:text-foreground"
                  onClick={() => toggleSort(col.key)}
                >
                  {col.label}
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
            ))}
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading &&
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 7 }).map((__, j) => (
                  <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                ))}
              </TableRow>
            ))}

          {isError && (
            <TableRow>
              <TableCell colSpan={7} className="py-10 text-center text-sm text-destructive">
                Failed to load users. Please try refreshing the page.
              </TableCell>
            </TableRow>
          )}

          {!isLoading && !isError && data?.items.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="py-14 text-center">
                <UserX className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="font-medium">No users found</p>
                <p className="text-sm text-muted-foreground">Try adjusting your search or filters.</p>
              </TableCell>
            </TableRow>
          )}

          {data?.items.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {getInitials(user.name)}
                  </div>
                  {user.name}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{user.email}</TableCell>
              <TableCell className="text-muted-foreground">
                {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {user.lastLoginAt ? formatDistanceToNow(new Date(user.lastLoginAt), { addSuffix: true }) : "Never"}
              </TableCell>
              <TableCell>{user.role.name}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANT[user.status]}>{user.status}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <Button variant="ghost" size="icon" aria-label={`Actions for ${user.name}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content align="end" className="z-50 w-40 rounded-md border bg-popover p-1 shadow-md">
                      {canUpdate && (
                        <DropdownMenu.Item
                          onSelect={() => { setEditingUser(user); setFormOpen(true); }}
                          className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </DropdownMenu.Item>
                      )}
                      {canDelete && (
                        <DropdownMenu.Item
                          onSelect={() => setDeletingUser(user)}
                          className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
                        >
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

      {/* Pagination */}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {page} of {data.pagination.totalPages} · {data.pagination.total} total
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        roles={roles}
        editingUser={editingUser}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["users"] })}
      />

      <ConfirmDialog
        open={!!deletingUser}
        onOpenChange={(open) => !open && setDeletingUser(null)}
        title="Delete user?"
        description={`This will permanently disable ${deletingUser?.name}'s access. This action can be reversed by an administrator via the database, but not from this UI.`}
        confirmLabel="Delete user"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
