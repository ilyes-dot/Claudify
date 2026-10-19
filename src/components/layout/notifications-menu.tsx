"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Bell, BellOff, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface NotificationItem {
  id: string;
  title: string;
  body: string | null;
  type: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
  readAt: string | null;
  createdAt: string;
}

const DOT_COLOR: Record<NotificationItem["type"], string> = {
  INFO: "bg-primary",
  SUCCESS: "bg-success",
  WARNING: "bg-warning",
  ERROR: "bg-destructive",
};

export function NotificationsMenu() {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications?limit=10");
      if (!res.ok) throw new Error("Failed to load notifications.");
      return res.json() as Promise<{ items: NotificationItem[]; unreadCount: number }>;
    },
    // Poll every 30s so new alerts (e.g. a lockout event) show up without
    // a manual refresh. Cheap enough for an admin panel's traffic profile.
    refetchInterval: 30_000,
  });

  const items = data?.items ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const markAllRead = async () => {
    await fetch("/api/notifications/read-all", { method: "POST" });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`} className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" aria-hidden="true" />
          )}
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" className="z-50 w-80 rounded-md border bg-popover p-2 text-popover-foreground shadow-md">
          <div className="flex items-center justify-between px-2 py-1.5">
            <p className="text-sm font-semibold">Notifications</p>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <Check className="h-3 w-3" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <BellOff className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">You&apos;re all caught up.</p>
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.readAt && markRead(n.id)}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent",
                    !n.readAt && "bg-accent/50"
                  )}
                >
                  <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", DOT_COLOR[n.type])} />
                  <div className="flex-1">
                    <p className={cn("font-medium", !n.readAt && "text-foreground", n.readAt && "text-muted-foreground")}>
                      {n.title}
                    </p>
                    {n.body && <p className="text-xs text-muted-foreground">{n.body}</p>}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
