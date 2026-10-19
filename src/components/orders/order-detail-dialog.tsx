"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { format } from "date-fns";
import { useToast } from "@/components/ui/toast";

const ALL_STATUSES = ["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];

interface OrderDetail {
  id: string; orderNumber: string; status: string; subtotal: string; shipping: string; total: string;
  notes: string | null; createdAt: string;
  customer: { name: string; email: string; phone: string | null; address: string | null; city: string | null; country: string | null };
  items: { id: string; nameSnapshot: string; priceSnapshot: string; quantity: number }[];
}

export function OrderDetailDialog({
  orderId, onOpenChange, canUpdate, onStatusChanged,
}: { orderId: string | null; onOpenChange: (open: boolean) => void; canUpdate: boolean; onStatusChanged: () => void }) {
  const { toast } = useToast();
  const [updating, setUpdating] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["order-detail", orderId],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${orderId}`);
      if (!res.ok) throw new Error("Failed to load order.");
      return (await res.json()).order as OrderDetail;
    },
    enabled: !!orderId,
  });

  const changeStatus = async (status: string) => {
    if (!orderId) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to update status.");
      refetch();
      onStatusChanged();
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Dialog open={!!orderId} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        {isLoading && <div className="space-y-3"><Skeleton className="h-6 w-1/2" /><Skeleton className="h-20 w-full" /><Skeleton className="h-32 w-full" /></div>}

        {data && (
          <>
            <DialogHeader>
              <DialogTitle>{data.orderNumber}</DialogTitle>
              <DialogDescription>Placed {format(new Date(data.createdAt), "PPp")}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">{data.customer.name}</p>
                  <p className="text-xs text-muted-foreground">{data.customer.email}</p>
                  {(data.customer.city || data.customer.country) && (
                    <p className="text-xs text-muted-foreground">{[data.customer.address, data.customer.city, data.customer.country].filter(Boolean).join(", ")}</p>
                  )}
                </div>
                {canUpdate ? (
                  <Select value={data.status} onValueChange={changeStatus} disabled={updating}>
                    <SelectTrigger className="w-36">
                      {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <SelectValue />}
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge>{data.status}</Badge>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Items</p>
                <div className="divide-y rounded-md border">
                  {data.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 text-sm">
                      <div>
                        <p>{item.nameSnapshot}</p>
                        <p className="text-xs text-muted-foreground">Qty {item.quantity} × ${Number(item.priceSnapshot).toFixed(2)}</p>
                      </div>
                      <p className="font-medium">${(Number(item.priceSnapshot) * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1 rounded-md border p-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${Number(data.subtotal).toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>${Number(data.shipping).toFixed(2)}</span></div>
                <div className="flex justify-between border-t pt-1 font-medium"><span>Total</span><span>${Number(data.total).toFixed(2)}</span></div>
              </div>

              {data.notes && <p className="text-sm text-muted-foreground">Note: {data.notes}</p>}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
