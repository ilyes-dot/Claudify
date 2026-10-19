"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { Users, ShieldCheck, ScrollText, Bell } from "lucide-react";

const MODULES = [
  { key: "module.users", label: "User Management", description: "Enable the Users nav item and its API.", icon: Users },
  { key: "module.roles", label: "Roles & Permissions", description: "Enable role/permission management.", icon: ShieldCheck },
  { key: "module.audit-logs", label: "Audit Logs", description: "Enable the audit trail viewer.", icon: ScrollText },
  { key: "module.notifications", label: "Notifications", description: "Enable in-app notification delivery.", icon: Bell },
];

function Switch({ checked, onCheckedChange, disabled }: { checked: boolean; onCheckedChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40", checked ? "bg-primary" : "bg-input")}
    >
      <SwitchPrimitive.Thumb className={cn("block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow transition-transform", checked && "translate-x-[22px]")} />
    </SwitchPrimitive.Root>
  );
}

export function SettingsPanel({ canEdit }: { canEdit: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed to load settings.");
      return res.json() as Promise<{ settings: Record<string, boolean> }>;
    },
  });

  const toggle = async (key: string, value: boolean) => {
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed to update setting.");
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast({ title: "Setting updated", variant: "success" });
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    }
  };

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Modules</CardTitle>
        <CardDescription>
          Toggle features on or off for this deployment without redeploying code. Disabled modules are hidden from
          the sidebar and their APIs return 403 for everyone.
        </CardDescription>
      </CardHeader>
      <CardContent className="divide-y">
        {MODULES.map((mod) => (
          <div key={mod.key} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                <mod.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">{mod.label}</p>
                <p className="text-sm text-muted-foreground">{mod.description}</p>
              </div>
            </div>
            <Switch
              checked={data?.settings[mod.key] ?? true}
              onCheckedChange={(v) => toggle(mod.key, v)}
              disabled={!canEdit}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
