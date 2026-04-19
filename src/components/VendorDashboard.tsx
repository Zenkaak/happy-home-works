import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getAppBaseUrl } from "@/lib/siteUrl";
import { Copy, LogOut, TrendingUp, DollarSign, Users, Wallet, Loader2, Share2 } from "lucide-react";
import VendorAnalytics from "@/components/VendorAnalytics";

interface VendorSession {
  vendor_id: string;
  name: string;
  referral_code: string;
}

interface Sale {
  id: string;
  phone_number: string;
  package_name: string;
  amount: number;
  status: string;
  mpesa_reference: string | null;
  created_at: string;
}

interface DashboardData {
  vendor: any;
  sales: Sale[];
  stats: {
    total_sales: number;
    total_revenue: number;
    commission: number; 
    commission_rate: number;
  };
}

const VendorDashboard = ({ session, onLogout }: { session: VendorSession; onLogout: () => void }) => {
  const { toast } = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");

  const referralLink = `${getAppBaseUrl()}/?ref=${session.referral_code}`;

  const fetchDashboard = async () => {
    try {
      const { data: res, error } = await supabase.functions.invoke("vendor-api", {
        body: { action: "get_dashboard", vendor_id: session.vendor_id },
      });
      if (error) throw error;
      if (res?.error) throw new Error(res.error);
      
      // We strictly set what the DB tells us. No local math.
      setData(res);
    } catch (err: any) {
      toast({ title: "Error loading dashboard", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchDashboard(); 
  }, [refreshKey]); // Refetches whenever refreshKey changes

  const handleWithdraw = async () => {
    const currentBalance = Number(data?.stats.commission || 0);
    
    if (currentBalance < 5) {
      return toast({ title: "Minimum withdrawal is KSH 5", variant: "destructive" });
    }
    
    setWithdrawing(true);
    
    // 1. OPTIMISTIC UPDATE: Set to 0 immediately in UI
    setData(prev => prev ? {
      ...prev,
      stats: { ...prev.stats, commission: 0 }
    } : null);

    try {
      const { data: res, error } = await supabase.functions.invoke("vendor-api", {
        body: { action: "request_withdrawal", vendor_id: session.vendor_id, amount: currentBalance },
      });

      if (error) throw new Error(error.message || "Network error");
      if (res?.error) throw new Error(res.error);
      if (!res?.success) throw new Error("Withdrawal could not be initiated");

      toast({ title: "Withdrawal initiated!", description: "Funds will arrive on M-Pesa shortly." });
      setRefreshKey(prev => prev + 1);

    } catch (err: any) {
      // REVERT on failure — refetch real balance from DB
      await fetchDashboard();
      toast({ title: "Withdrawal failed", description: err.message, variant: "destructive" });
    } finally {
      setWithdrawing(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({ title: "Link copied!" });
  };

  const shareWhatsApp = () => {
    const msg = `🔥 DASNET deals - cheapest data, KPLC tokens & more!\n\nGet started here:\n${referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const maskPhone = (phone: string) => {
    if (!phone) return "****";
    const cleaned = phone.replace(/[^0-9]/g, "");
    return cleaned.slice(0, 3) + "****" + cleaned.slice(-3);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="px-4 py-4 max-w-lg mx-auto space-y-4 pb-8" key={refreshKey}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-lg font-bold">Hi, {session.name} 👋</h1>
          <p className="text-xs text-muted-foreground">Vendor Dashboard</p>
        </div>
        <button onClick={onLogout} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors font-medium">
          <LogOut className="w-3.5 h-3.5" /> Logout
        </button>
      </div>

      <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 space-y-2">
        <p className="text-xs font-semibold text-primary">Your Referral Link</p>
        <div className="flex items-center gap-2">
          <input readOnly value={referralLink} className="flex-1 text-xs bg-background rounded-lg px-3 py-2 border border-border truncate focus:outline-none" />
          <button onClick={copyLink} className="shrink-0 p-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition-all">
            <Copy className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={shareWhatsApp}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-[#25D366] text-white text-xs font-bold hover:opacity-90 active:scale-95 transition-all"
        >
          <Share2 className="w-3.5 h-3.5" /> Share on WhatsApp
        </button>
      </div>

      <VendorAnalytics sales={data?.sales || []} />

      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Sales</span>
          </div>
          <p className="text-xl font-bold">{data?.stats.total_sales || 0}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Revenue</span>
          </div>
          <p className="text-xl font-bold">KSH {data?.stats.total_revenue || 0}</p>
        </div>
        
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-primary" />
                <span className="text-[10px] text-primary uppercase tracking-wider font-bold">Available Balance</span>
              </div>
              {/* THE "14 KILLER": Strictly render the number from DB stats */}
              <p className="text-3xl font-black text-primary">
                KSH {Math.floor(Number(data?.stats.commission || 0))}
              </p>
            </div>
            <button
              onClick={handleWithdraw}
              disabled={withdrawing || !data?.stats.commission || data.stats.commission < 5}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50 hover:shadow-lg transition-all active:scale-95"
            >
              {withdrawing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wallet className="w-3.5 h-3.5" />}
              Withdraw
            </button>
          </div>
        </div>
      </div>

      <div>
        <h2 className="font-bold text-sm mb-3">Recent Sales</h2>
        {(!data?.sales || data.sales.length === 0) ? (
          <div className="text-center py-10 text-muted-foreground text-sm border-2 border-dashed rounded-xl bg-muted/20">
            <p>No sales yet. Start sharing!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {data.sales.map((sale) => (
              <div key={sale.id} className="bg-card border border-border rounded-xl p-3 hover:border-primary/30 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold">{sale.package_name}</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    sale.status === "completed" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                  }`}>
                    {sale.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="font-mono">{maskPhone(sale.phone_number)}</span>
                  <span className="font-semibold text-foreground">KSH {sale.amount}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default VendorDashboard;
