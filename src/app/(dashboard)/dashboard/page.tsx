import { DollarSign, ShoppingCart, Package, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac";
import { RevenueTrendChart } from "@/components/dashboard/revenue-trend-chart";
import { OrderStatusChart } from "@/components/dashboard/order-status-chart";
import { formatDistanceToNow } from "date-fns";

export const metadata = { title: "Dashboard" };

const STATUS_VARIANT: Record<string, "success" | "secondary" | "warning" | "destructive" | "outline"> = {
  PENDING: "secondary", PAID: "success", SHIPPED: "outline", DELIVERED: "success", CANCELLED: "destructive", REFUNDED: "warning",
};

async function getDashboardData() {
  const [totalProducts, totalCustomers, orderStats, recentOrders] = await Promise.all([
    prisma.product.count({ where: { deletedAt: null, status: "ACTIVE" } }),
    prisma.customer.count({ where: { deletedAt: null } }),
    prisma.order.aggregate({
      where: { status: { notIn: ["CANCELLED"] } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.order.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: { customer: { select: { name: true } } },
    }),
  ]);

  const statusBreakdown = await prisma.order.groupBy({ by: ["status"], _count: true });

  // Revenue per day for the last 14 days — real aggregation, not mocked.
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const recentOrdersForTrend = await prisma.order.findMany({
    where: { createdAt: { gte: fourteenDaysAgo }, status: { notIn: ["CANCELLED"] } },
    select: { createdAt: true, total: true },
  });
  const trend: Record<string, number> = {};
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    trend[d.toISOString().slice(0, 10)] = 0;
  }
  for (const o of recentOrdersForTrend) {
    const key = o.createdAt.toISOString().slice(0, 10);
    if (key in trend) trend[key]! += Number(o.total);
  }

  const lowStockCount = await prisma.product.count({ where: { deletedAt: null, status: "ACTIVE", stock: { lt: 10 } } });

  return {
    totalProducts,
    totalCustomers,
    totalRevenue: Number(orderStats._sum.total ?? 0),
    totalOrders: orderStats._count,
    lowStockCount,
    recentOrders,
    statusBreakdown: statusBreakdown.map((s) => ({ name: s.status, value: s._count })),
    trend: Object.entries(trend).map(([date, revenue]) => ({ date, revenue })),
  };
}

export default async function DashboardPage() {
  await requirePermission("dashboard:view");
  const data = await getDashboardData();

  const kpis = [
    { label: "Total Revenue", value: `$${data.totalRevenue.toFixed(2)}`, icon: DollarSign },
    { label: "Orders", value: data.totalOrders, icon: ShoppingCart },
    { label: "Active Products", value: data.totalProducts, icon: Package, flag: data.lowStockCount > 0 ? `${data.lowStockCount} low stock` : undefined },
    { label: "Customers", value: data.totalCustomers, icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your store&apos;s sales and activity.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm text-muted-foreground">{kpi.label}</p>
                <p className="text-2xl font-bold">{kpi.value}</p>
                {kpi.flag && <p className="text-xs text-warning">{kpi.flag}</p>}
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <kpi.icon className="h-5 w-5 text-primary" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Revenue (last 14 days)</CardTitle></CardHeader>
          <CardContent><RevenueTrendChart data={data.trend} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Orders by Status</CardTitle></CardHeader>
          <CardContent><OrderStatusChart data={data.statusBreakdown} /></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent Orders</CardTitle></CardHeader>
        <CardContent>
          {data.recentOrders.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <ul className="divide-y">
              {data.recentOrders.map((order) => (
                <li key={order.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <span className="font-medium">{order.orderNumber}</span>{" "}
                    <span className="text-muted-foreground">— {order.customer.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">${Number(order.total).toFixed(2)}</span>
                    <Badge variant={STATUS_VARIANT[order.status] ?? "outline"}>{order.status}</Badge>
                    <span className="text-xs text-muted-foreground">{formatDistanceToNow(order.createdAt, { addSuffix: true })}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
