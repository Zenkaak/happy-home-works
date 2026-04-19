import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { format, subDays, startOfDay } from "date-fns";

interface Sale {
  id: string;
  package_name: string;
  amount: number;
  status: string;
  created_at: string;
}

const VendorAnalytics = ({ sales }: { sales: Sale[] }) => {
  const completed = useMemo(() => sales.filter((s) => s.status === "completed"), [sales]);

  const dailyData = useMemo(() => {
    const days: { date: string; revenue: number; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const day = startOfDay(subDays(new Date(), i));
      const dayKey = format(day, "yyyy-MM-dd");
      const sub = completed.filter((s) => format(startOfDay(new Date(s.created_at)), "yyyy-MM-dd") === dayKey);
      days.push({
        date: format(day, "MMM d"),
        revenue: sub.reduce((acc, s) => acc + s.amount, 0),
        count: sub.length,
      });
    }
    return days;
  }, [completed]);

  const topPackages = useMemo(() => {
    const map = new Map<string, { name: string; count: number; revenue: number }>();
    completed.forEach((s) => {
      const cur = map.get(s.package_name) || { name: s.package_name, count: 0, revenue: 0 };
      cur.count += 1;
      cur.revenue += s.amount;
      map.set(s.package_name, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [completed]);

  if (completed.length === 0) {
    return (
      <div className="text-center py-6 text-xs text-muted-foreground border-2 border-dashed rounded-xl bg-muted/20">
        Make your first sale to unlock analytics
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-3">
        <p className="text-xs font-bold mb-2">Last 30 Days Revenue</p>
        <div className="h-32 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailyData}>
              <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={5} />
              <YAxis tick={{ fontSize: 9 }} width={30} />
              <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "8px" }} />
              <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {topPackages.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-xs font-bold mb-2">Top Packages</p>
          <div className="space-y-1.5">
            {topPackages.map((p) => (
              <div key={p.name} className="flex items-center justify-between text-xs">
                <span className="truncate max-w-[60%]">{p.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{p.count}x</span>
                  <span className="font-bold">KSH {p.revenue.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorAnalytics;
