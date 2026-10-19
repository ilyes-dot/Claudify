"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, ShoppingCart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { format } from "date-fns";
import { OrderDetailDialog } from "@/components/orders/order-detail-dialog";

interface OrderRow {
  id: string; orderNumber: string; status: string; total: string; createdAt: string;
  customer: { name: string; email: string }; _count: { items: number };
}

const STATUS_VARIANT: Record<string, "success" | "secondary" | "warning" | "destructive" | "outline"> = {
  PENDING: "secondary", PAID: "success", SHIPPED: "outline", DELIVERED: "success", CANCELLED: "destructive", REFUNDED: "warning",
};

const PAGE_SIZE = 10;

export function OrdersTable({ canUpdate }: { canUpdate: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["orders", { search, statusFilter, page }],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/orders?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load orders.");
      return res.json() as Promise<{ items: OrderRow[]; pagination: { total: number; totalPages: number } }>;
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search order # or customer…" className="pl-9" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"].map((s) => (
                <SelectItem key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order #</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Items</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>{Array.from({ length: 6 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
          ))}

          {!isLoading && data?.items.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-14 text-center">
                <ShoppingCart className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="font-medium">No orders found</p>
              </TableCell>
            </TableRow>
          )}

          {data?.items.map((order) => (
            <TableRow key={order.id} className="cursor-pointer" onClick={() => setSelectedOrderId(order.id)}>
              <TableCell className="font-medium">{order.orderNumber}</TableCell>
              <TableCell>
                <div>
                  <p>{order.customer.name}</p>
                  <p className="text-xs text-muted-foreground">{order.customer.email}</p>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{order._count.items}</TableCell>
              <TableCell>${Number(order.total).toFixed(2)}</TableCell>
              <TableCell><Badge variant={STATUS_VARIANT[order.status] ?? "outline"}>{order.status}</Badge></TableCell>
              <TableCell className="text-muted-foreground">{format(new Date(order.createdAt), "PP")}</TableCell>
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

      <OrderDetailDialog
        orderId={selectedOrderId}
        onOpenChange={(open) => !open && setSelectedOrderId(null)}
        canUpdate={canUpdate}
        onStatusChanged={() => {
          queryClient.invalidateQueries({ queryKey: ["orders"] });
          toast({ title: "Order status updated", variant: "success" });
        }}
      />
    </div>
  );
}
