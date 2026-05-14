import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, Loader2, ArrowLeft, Repeat, Wallet, Home } from "lucide-react";
import ManualPaymentModal from "@/components/ManualPaymentModal";
import type { Transaction } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

const OrderStatus = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tx, setTx] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [showManual, setShowManual] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!id) return;
    let mounted = true;

    const fetchTx = async () => {
      const { data } = await supabase.from("transactions").select("*").eq("id", id).maybeSingle();
      if (mounted && data) setTx(data as Transaction);
      if (mounted) setLoading(false);
    };

    fetchTx();

    const channel = supabase
      .channel(`tx-${id}`)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "transactions", filter: `id=eq.${id}` },
        (payload) => { if (mounted) setTx(payload.new as Transaction); }
      )
      .subscribe();

    const interval = setInterval(fetchTx, 5000);

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [id]);

  const retryStk = async () => {
    if (!tx) return;
    setRetrying(true);
    try {
      const { data, error } = await supabase.functions.invoke("initiate-stk", {
        body: {
          phone: tx.phone_number,
          amount: tx.amount,
          transaction_id: tx.id,
          account_ref: buildAccountRef({ category: tx.category, packageName: tx.package_name }),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "STK sent!", description: "Check your phone." });
    } catch (e: any) {
      toast({ title: "Retry failed", description: e.message, variant: "destructive" });
    } finally {
      setRetrying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!tx) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3 p-6">
        <p className="text-muted-foreground">Order not found</p>
        <Link to="/" className="text-primary font-semibold underline">Go home</Link>
      </div>
    );
  }

  const status = tx.status;
  const isCompleted = status === "completed";
  const isFailed = status === "failed";
  const isPending = !isCompleted && !isFailed;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 px-4 py-3 bg-card/95 backdrop-blur-md border-b border-border flex items-center gap-2">
        <button onClick={() => navigate("/")} className="p-1.5 rounded-lg hover:bg-secondary">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="font-display font-bold text-sm leading-tight">Order #{tx.order_number}</h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Live Status</p>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-4">
        {/* Status hero */}
        <div className={`rounded-2xl p-6 text-center border-2 ${
          isCompleted ? "border-primary/30 bg-primary/5" :
          isFailed ? "border-destructive/30 bg-destructive/5" :
          "border-warning/30 bg-warning/5"
        }`}>
          <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-3 bg-card">
            {isCompleted && <CheckCircle2 className="w-9 h-9 text-primary" />}
            {isFailed && <XCircle className="w-9 h-9 text-destructive" />}
            {isPending && <Loader2 className="w-9 h-9 text-warning animate-spin" />}
          </div>
          <h2 className="font-display font-bold text-lg">
            {isCompleted ? "Order Completed!" : isFailed ? "Payment Failed" : "Awaiting Payment..."}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {isCompleted ? "Your purchase has been delivered." :
             isFailed ? (tx.failure_reason || "STK was cancelled or timed out") :
             "Complete the M-PESA prompt on your phone."}
          </p>
        </div>

        {/* Details */}
        <div className="rounded-xl bg-card border border-border p-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Package</span><span className="font-semibold">{tx.package_name}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-bold">KSH {tx.amount.toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span className="font-mono">{tx.phone_number}</span></div>
          {tx.mpesa_reference && (
            <div className="flex justify-between"><span className="text-muted-foreground">M-PESA Ref</span><span className="font-mono text-primary">{tx.mpesa_reference}</span></div>
          )}
          {tx.kplc_token && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1">KPLC Token</p>
              <p className="font-mono text-base font-bold tracking-wider bg-secondary rounded-lg p-2 text-center">{tx.kplc_token}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        {isFailed && (
          <div className="space-y-2">
            <button
              onClick={retryStk}
              disabled={retrying}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {retrying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Repeat className="w-4 h-4" />}
              Retry M-PESA Prompt
            </button>
            <button
              onClick={() => setShowManual(true)}
              className="w-full py-3 rounded-xl border border-primary/40 bg-primary/5 text-primary font-bold text-sm flex items-center justify-center gap-2"
            >
              <Wallet className="w-4 h-4" />
              Pay manually via Till 8448104
            </button>
          </div>
        )}

        {isCompleted && (
          <button onClick={() => navigate("/")} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2">
            <Home className="w-4 h-4" /> Buy Another
          </button>
        )}

        {isPending && (
          <p className="text-center text-xs text-muted-foreground">
            This page updates automatically. Don't close.
          </p>
        )}
      </main>

      {showManual && (
        <ManualPaymentModal
          transactionId={tx.id}
          phoneNumber={tx.phone_number}
          amount={tx.amount}
          packageName={tx.package_name}
          onClose={() => setShowManual(false)}
        />
      )}
    </div>
  );
};

export default OrderStatus;
