"use client";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export function RevenueTrendChart({ data }: { data: { date: string; revenue: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ left: -20 }}>
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="date" tickFormatter={(d) => d.slice(5)} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
        <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
        <Tooltip
          formatter={(value: number) => [`$${value.toFixed(2)}`, "Revenue"]}
          contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
        />
        <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#colorRevenue)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
