"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ShieldCheck, Lock, Trash2, Loader2, Users as UsersIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/users/confirm-dialog";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

interface Permission { id: string; key: string; module: string; action: string; description: string | null }
interface Role {
  id: string; name: string; description: string | null; isSystem: boolean;
  permissions: { permission: Permission }[];
  _count: { users: number };
}

function Switch({ checked, onCheckedChange, disabled, label }: { checked: boolean; onCheckedChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        checked ? "bg-primary" : "bg-input"
      )}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "block h-4 w-4 translate-x-0.5 rounded-full bg-white shadow transition-transform will-change-transform",
          checked && "translate-x-[18px]"
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export function RolesManager({ canEdit }: { canEdit: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);
  const [pendingKeys, setPendingKeys] = useState<Set<string> | null>(null);
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const res = await fetch("/api/roles");
      if (!res.ok) throw new Error("Failed to load roles.");
      return res.json() as Promise<{ roles: Role[]; permissions: Permission[] }>;
    },
  });

  const roles = data?.roles ?? [];
  const permissions = data?.permissions ?? [];
  const modules = Array.from(new Set(permissions.map((p) => p.module)));

  const selectedRole = roles.find((r) => r.id === selectedRoleId) ?? roles[0];
  const activeKeys = pendingKeys ?? new Set(selectedRole?.permissions.map((p) => p.permission.key) ?? []);

  const startEditing = (role: Role) => {
    setSelectedRoleId(role.id);
    setPendingKeys(new Set(role.permissions.map((p) => p.permission.key)));
  };

  const togglePermission = (key: string) => {
    if (!selectedRole || selectedRole.isSystem) return;
    const next = new Set(activeKeys);
    next.has(key) ? next.delete(key) : next.add(key);
    setPendingKeys(next);
  };

  const savePermissions = async () => {
    if (!selectedRole || !pendingKeys) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/roles/${selectedRole.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissionKeys: Array.from(pendingKeys) }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to save permissions.");
      toast({ title: "Permissions updated", description: `${selectedRole.name} was updated.`, variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const createRole = async () => {
    if (!newRoleName.trim()) return;
    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newRoleName, description: newRoleDesc, permissionKeys: [] }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to create role.");
      toast({ title: "Role created", description: `${newRoleName} is ready to configure.`, variant: "success" });
      setCreateOpen(false);
      setNewRoleName("");
      setNewRoleDesc("");
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    } catch (err: any) {
      toast({ title: "Create failed", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteRole = async () => {
    if (!deletingRole) return;
    try {
      const res = await fetch(`/api/roles/${deletingRole.id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to delete role.");
      toast({ title: "Role deleted", variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      if (selectedRoleId === deletingRole.id) setSelectedRoleId(null);
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    } finally {
      setDeletingRole(null);
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-64" />
        <Skeleton className="h-64 lg:col-span-2" />
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Role list */}
      <Card className="lg:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Roles</CardTitle>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> New
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-1">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => startEditing(role)}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors",
                selectedRole?.id === role.id ? "bg-primary text-primary-foreground" : "hover:bg-accent"
              )}
            >
              <span className="flex items-center gap-2">
                {role.isSystem ? <Lock className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                {role.name}
              </span>
              <Badge variant={selectedRole?.id === role.id ? "secondary" : "outline"} className="gap-1">
                <UsersIcon className="h-3 w-3" /> {role._count.users}
              </Badge>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Permission matrix */}
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-base">
              {selectedRole?.name ?? "Select a role"}
              {selectedRole?.isSystem && (
                <Badge variant="outline" className="ml-2 align-middle">System role</Badge>
              )}
            </CardTitle>
            <CardDescription>{selectedRole?.description ?? "Choose a role from the list to edit its permissions."}</CardDescription>
          </div>
          {selectedRole && !selectedRole.isSystem && canEdit && (
            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeletingRole(selectedRole)} aria-label={`Delete ${selectedRole.name}`}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {selectedRole?.isSystem && (
            <p className="mb-4 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
              System roles ship with fixed permissions to prevent accidental lockouts. Duplicate the permissions into a
              new custom role if you need a variation.
            </p>
          )}
          <div className="space-y-4">
            {modules.map((module) => (
              <div key={module}>
                <p className="mb-2 text-sm font-semibold capitalize">{module.replace(/-/g, " ")}</p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {permissions
                    .filter((p) => p.module === module)
                    .map((perm) => (
                      <label key={perm.key} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                        <Switch
                          checked={activeKeys.has(perm.key)}
                          onCheckedChange={() => togglePermission(perm.key)}
                          disabled={!canEdit || !selectedRole || selectedRole.isSystem}
                          label={perm.description ?? perm.key}
                        />
                        <span className="capitalize">{perm.action}</span>
                      </label>
                    ))}
                </div>
              </div>
            ))}
          </div>
          {canEdit && selectedRole && !selectedRole.isSystem && (
            <div className="mt-6 flex justify-end">
              <Button onClick={savePermissions} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save permissions
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create role</DialogTitle>
            <DialogDescription>New roles start with no permissions — configure them after creating.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="roleName">Role name</Label>
              <Input id="roleName" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roleDesc">Description</Label>
              <Input id="roleDesc" value={newRoleDesc} onChange={(e) => setNewRoleDesc(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createRole}>Create role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deletingRole}
        onOpenChange={(open) => !open && setDeletingRole(null)}
        title="Delete role?"
        description={`This will permanently delete "${deletingRole?.name}". Roles with assigned users cannot be deleted.`}
        confirmLabel="Delete role"
        variant="destructive"
        onConfirm={handleDeleteRole}
      />
    </div>
  );
}
