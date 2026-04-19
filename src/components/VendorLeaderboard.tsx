import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Medal, Award } from "lucide-react";

const VendorLeaderboard = () => {
  const { data: vendors } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select("name, total_sales, total_revenue")
        .eq("status", "approved")
        .gt("total_sales", 0)
        .order("total_revenue", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (!vendors || vendors.length === 0) return null;

  const maskName = (n: string) => {
    if (!n) return "Anonymous";
    const parts = n.trim().split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2) + "***";
    return parts[0] + " " + parts[1].charAt(0) + ".";
  };

  const icons = [
    <Trophy key="t" className="w-4 h-4 text-yellow-500" />,
    <Medal key="m" className="w-4 h-4 text-gray-400" />,
    <Award key="a" className="w-4 h-4 text-amber-700" />,
  ];

  return (
    <section className="px-4 py-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-5 h-5 text-primary" />
          <h2 className="font-display font-bold text-base">Top Vendors This Month</h2>
        </div>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {vendors.map((v: any, i: number) => (
            <div key={i} className={`flex items-center justify-between px-3 py-2.5 ${i !== vendors.length - 1 ? "border-b border-border" : ""}`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center font-bold text-xs shrink-0">
                  {icons[i] || <span className="text-muted-foreground">{i + 1}</span>}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{maskName(v.name)}</p>
                  <p className="text-[10px] text-muted-foreground">{v.total_sales} sales</p>
                </div>
              </div>
              <p className="text-sm font-bold text-primary shrink-0">KSH {Number(v.total_revenue).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default VendorLeaderboard;
