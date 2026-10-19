"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScrollText, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { format } from "date-fns";

interface AuditLogEntry {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  actor: { name: string; email: string } | null;
}

function actionVariant(action: string) {
  if (action.includes("delete") || action.includes("failed")) return "destructive" as const;
  if (action.includes("create")) return "success" as const;
  if (action.includes("update")) return "secondary" as const;
  return "outline" as const;
}

export function AuditLogTable() {
  const [actionFilter, setActionFilter] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", actionFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (actionFilter) params.set("action", actionFilter);
      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load audit logs.");
      return res.json() as Promise<{ items: AuditLogEntry[]; pagination: { total: number; totalPages: number } }>;
    },
  });

  return (
    <div className="space-y-4">
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Filter by action (e.g. user.delete)…"
          className="pl-9"
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Actor</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Target</TableHead>
            <TableHead>IP Address</TableHead>
            <TableHead>When</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading &&
            Array.from({ length: 6 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 5 }).map((__, j) => (
                  <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                ))}
              </TableRow>
            ))}

          {!isLoading && data?.items.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="py-14 text-center">
                <ScrollText className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="font-medium">No matching activity</p>
              </TableCell>
            </TableRow>
          )}

          {data?.items.map((log) => (
            <TableRow key={log.id}>
              <TableCell>
                {log.actor ? (
                  <div>
                    <p className="font-medium">{log.actor.name}</p>
                    <p className="text-xs text-muted-foreground">{log.actor.email}</p>
                  </div>
                ) : (
                  <span className="text-muted-foreground">System</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={actionVariant(log.action)}>{log.action}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {log.targetType ? `${log.targetType} · ${log.targetId?.slice(0, 8)}…` : "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">{log.ipAddress ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">{format(new Date(log.createdAt), "PP p")}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {page} of {data.pagination.totalPages} · {data.pagination.total} entries</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= data.pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
