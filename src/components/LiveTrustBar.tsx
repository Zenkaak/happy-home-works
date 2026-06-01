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
      <div className="grid grid-cols-4 gap-1.5 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card/60 to-card/40 backdrop-blur-sm p-2">
        {items.map((it) => (
          <div
            key={it.label}
            className="flex flex-col items-center text-center px-1 py-1.5 rounded-lg"
          >
            <it.icon className="w-3.5 h-3.5 text-primary mb-1" />
            <span className="text-[12px] font-extrabold text-foreground leading-none tracking-tight">
              {it.value}
            </span>
            <span className="text-[8.5px] text-muted-foreground uppercase tracking-wider mt-1 leading-none">
              {it.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LiveTrustBar;
