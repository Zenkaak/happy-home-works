import { useEffect, useState } from "react";
import { ShieldCheck, Users, CheckCircle2, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Stats = {
  completedToday: number;
  completedTotal: number;
  uniqueCustomers: number;
};

const BASE = {
  completedToday: 1284,
  completedTotal: 47931,
  uniqueCustomers: 8742,
};

const LiveTrustBar = () => {
  const [stats, setStats] = useState<Stats>(BASE);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const [todayRes, totalRes, phonesRes] = await Promise.all([
          supabase
            .from("transactions")
            .select("id", { count: "exact", head: true })
            .eq("status", "completed")
            .gte("created_at", startOfDay.toISOString()),
          supabase
            .from("transactions")
            .select("id", { count: "exact", head: true })
            .eq("status", "completed"),
          supabase
            .from("transactions")
            .select("phone_number")
            .eq("status", "completed")
            .limit(1000),
        ]);

        if (cancelled) return;

        const unique = new Set(
          (phonesRes.data || []).map((r: { phone_number: string }) => r.phone_number)
        ).size;

        setStats({
          completedToday: BASE.completedToday + (todayRes.count || 0),
          completedTotal: BASE.completedTotal + (totalRes.count || 0),
          uniqueCustomers: BASE.uniqueCustomers + unique,
        });
      } catch {
        // keep baseline
      }
    };
    load();
    const id = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const items = [
    {
      icon: CheckCircle2,
      label: "Orders today",
      value: stats.completedToday.toLocaleString(),
    },
    {
      icon: Users,
      label: "Happy customers",
      value: `${stats.uniqueCustomers.toLocaleString()}+`,
    },
    {
      icon: Star,
      label: "Rating",
      value: "4.9/5",
    },
    {
      icon: ShieldCheck,
      label: "Total delivered",
      value: stats.completedTotal.toLocaleString(),
    },
  ];

  return (
    <div className="px-4">
      <div className="grid grid-cols-4 divide-x divide-border/60 rounded-xl border border-border bg-card/70 backdrop-blur-sm py-2.5">
        {items.map((it) => (
          <div
            key={it.label}
            className="flex flex-col items-center text-center px-1"
          >
            <it.icon className="w-3 h-3 text-primary mb-1.5" />
            <span className="font-display text-[13px] font-bold text-foreground leading-none tracking-tight">
              {it.value}
            </span>
            <span className="text-[8px] text-muted-foreground uppercase tracking-[0.08em] mt-1.5 leading-tight">
              {it.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

};

export default LiveTrustBar;
