import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import type { Transaction } from "@/lib/types";

interface AdminRevenueChartsProps {
  transactions: Transaction[] | undefined;
}

const AdminRevenueCharts = ({ transactions }: AdminRevenueChartsProps) => {
  const dailyData = useMemo(() => {
    if (!transactions) return [];
    const days: Record<string, { revenue: number; orders: number; success: number; failed: number }> = {};
    
    for (let i = 6; i >= 0; i--) {
      const day = format(subDays(new Date(), i), "MMM dd");
      days[day] = { revenue: 0, orders: 0, success: 0, failed: 0 };
    }
    
    transactions.forEach((tx) => {
      const day = format(new Date(tx.created_at), "MMM dd");
      if (days[day]) {
        days[day].orders++;
        if (tx.status === "completed") {
          days[day].revenue += tx.amount;
          days[day].success++;
        }
        if (tx.status === "failed") days[day].failed++;
      }
    });
    
    return Object.entries(days).map(([date, data]) => ({ date, ...data }));
  }, [transactions]);

  const networkBreakdown = useMemo(() => {
    if (!transactions) return [];
    const nets: Record<string, number> = {};
    transactions.filter(t => t.status === "completed").forEach((tx) => {
      const net = tx.network || tx.category;
      nets[net] = (nets[net] || 0) + tx.amount;
    });
    return Object.entries(nets).map(([name, amount]) => ({ name, amount }));
  }, [transactions]);

  const weekRevenue = dailyData.reduce((s, d) => s + d.revenue, 0);
  const weekOrders = dailyData.reduce((s, d) => s + d.orders, 0);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="gradient-card rounded-xl p-4">
          <p className="text-[10px] text-muted-foreground uppercase font-bold">7-Day Revenue</p>
          <p className="text-xl font-bold text-primary">KES {weekRevenue.toLocaleString()}</p>
        </div>
        <div className="gradient-card rounded-xl p-4">
          <p className="text-[10px] text-muted-foreground uppercase font-bold">7-Day Orders</p>
          <p className="text-xl font-bold">{weekOrders}</p>
        </div>
      </div>

      {/* Revenue Bar Chart */}
      <div className="gradient-card rounded-xl p-4">
        <h3 className="font-bold text-sm mb-4">📊 Daily Revenue (7 Days)</h3>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 18%)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(215 20% 55%)" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(215 20% 55%)" }} />
              <Tooltip
                contentStyle={{ background: "hsl(220 18% 10%)", border: "1px solid hsl(220 14% 18%)", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "hsl(210 40% 98%)" }}
              />
              <Bar dataKey="revenue" fill="hsl(160 84% 39%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Orders Line Chart */}
      <div className="gradient-card rounded-xl p-4">
        <h3 className="font-bold text-sm mb-4">📈 Daily Orders (Success vs Failed)</h3>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 18%)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(215 20% 55%)" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(215 20% 55%)" }} />
              <Tooltip
                contentStyle={{ background: "hsl(220 18% 10%)", border: "1px solid hsl(220 14% 18%)", borderRadius: 8, fontSize: 12 }}
              />
              <Line type="monotone" dataKey="success" stroke="hsl(160 84% 39%)" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="failed" stroke="hsl(0 84% 60%)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Network Breakdown */}
      {networkBreakdown.length > 0 && (
        <div className="gradient-card rounded-xl p-4">
          <h3 className="font-bold text-sm mb-3">🌐 Revenue by Network</h3>
          <div className="space-y-2">
            {networkBreakdown.sort((a, b) => b.amount - a.amount).map((net) => (
              <div key={net.name} className="flex items-center justify-between">
                <span className="text-sm capitalize">{net.name}</span>
                <span className="text-sm font-bold text-primary">KES {net.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRevenueCharts;
