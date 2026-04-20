import { useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, Loader2, RefreshCw, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const getAdminToken = () => localStorage.getItem("dasnet_admin_token");

interface BalanceItem {
  label: string;
  currency: string;
  available: number;
}

interface BalanceSnapshot {
  created_at: string;
  items: BalanceItem[];
}

const AdminPaybillTools = () => {
  const { toast } = useToast();
  const [snapshot, setSnapshot] = useState<BalanceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");

  const invokeAdmin = async (action: string, params: Record<string, unknown> = {}) => {
    const token = getAdminToken();
    if (!token) throw new Error("Not authenticated");

    const { data, error } = await supabase.functions.invoke("admin-api", {
      body: { action, ...params },
      headers: { "x-admin-token": token },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const fetchSnapshot = async () => {
    const data = await invokeAdmin("get_paybill_balance");
    setSnapshot(data?.snapshot ?? null);
    return data?.snapshot ?? null;
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const data = await invokeAdmin("get_paybill_balance");
        if (mounted) setSnapshot(data?.snapshot ?? null);
      } catch (err: any) {
        if (mounted) toast({ title: "Balance unavailable", description: err.message, variant: "destructive" });
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const totalBalance = useMemo(
    () => (snapshot?.items || []).reduce((sum, item) => sum + Number(item.available || 0), 0),
    [snapshot],
  );

  const handleRefresh = async () => {
    setRefreshing(true);

    try {
      const previousStamp = snapshot?.created_at;
      await invokeAdmin("refresh_paybill_balance");

      for (let i = 0; i < 4; i++) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        const next = await fetchSnapshot();
        if (next?.created_at && next.created_at !== previousStamp) {
          toast({ title: "Balance updated" });
          setRefreshing(false);
          return;
        }
      }

      toast({ title: "Balance request sent", description: "Refresh again in a few seconds if it has not updated yet." });
    } catch (err: any) {
      toast({ title: "Refresh failed", description: err.message, variant: "destructive" });
    } finally {
      setRefreshing(false);
    }
  };

  const handlePayout = async () => {
    const parsedAmount = Math.floor(Number(amount));

    if (!phone.trim() || !parsedAmount || parsedAmount < 1) {
      return toast({ title: "Enter a valid number and amount", variant: "destructive" });
    }

    setSending(true);

    try {
      await invokeAdmin("initiate_admin_b2c", { phone, amount: parsedAmount });
      toast({ title: "B2C initiated", description: `KSH ${parsedAmount} is being sent to ${phone}.` });
      setPhone("");
      setAmount("");
    } catch (err: any) {
      toast({ title: "B2C failed", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <section className="gradient-card rounded-2xl border border-border/60 p-4 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-primary font-bold">Paybill Balance</p>
              <h2 className="font-display font-bold text-lg">All wallet balances</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Latest snapshot from the paybill shortcode.
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-3 py-2 text-xs font-bold disabled:opacity-60"
            >
              {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Refresh
            </button>
          </div>

          <div className="rounded-xl bg-secondary/30 border border-border/50 p-4">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Total balance</p>
            <p className="font-display text-3xl font-black text-foreground mt-1">KSH {totalBalance.toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {snapshot?.created_at ? `Updated ${new Date(snapshot.created_at).toLocaleString()}` : "No balance snapshot yet."}
            </p>
          </div>

          {loading && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          )}
        </section>

        <section className="gradient-card rounded-2xl border border-border/60 p-4 space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-primary font-bold">Admin B2C</p>
            <h2 className="font-display font-bold text-lg">Withdraw to phone</h2>
            <p className="text-xs text-muted-foreground mt-1">Enter the number and amount, then initiate payout.</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-foreground/80 mb-1.5">Phone Number</label>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="07XX XXX XXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-border bg-secondary/60 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-foreground/80 mb-1.5">Amount (KSH)</label>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                placeholder="e.g. 100"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-border bg-secondary/60 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          <button
            onClick={handlePayout}
            disabled={sending}
            className="w-full rounded-xl bg-primary text-primary-foreground px-4 py-3 text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDownToLine className="w-4 h-4" />}
            {sending ? "Initiating..." : "Initiate B2C"}
          </button>

          <div className="rounded-xl bg-secondary/30 border border-border/50 px-3 py-3 text-xs text-muted-foreground flex items-start gap-2">
            <Wallet className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p>Payout status is handled by the backend after M-Pesa responds.</p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminPaybillTools;