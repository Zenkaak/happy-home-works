import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Search, CheckCircle2, XCircle, Loader2, Receipt, Eye, Trash2, Repeat, Wallet, ShoppingCart, TrendingUp, Activity, X } from "lucide-react";
import Footer from "@/components/Footer";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import type { Transaction } from "@/lib/types";
import TransactionDetailModal from "@/components/TransactionDetailModal";
import ManualPaymentModal from "@/components/ManualPaymentModal";
import { useToast } from "@/hooks/use-toast";
import { formatPhoneTo254 } from "@/lib/formatPhone";
import { buildAccountRef } from "@/lib/accountRef";

const History = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [manualTx, setManualTx] = useState<Transaction | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retryTx, setRetryTx] = useState<Transaction | null>(null);
  const [retryPhone, setRetryPhone] = useState("");

  const retryStk = async (tx: Transaction) => {
    setRetryingId(tx.id);
    try {
      const { data, error } = await supabase.functions.invoke("initiate-stk", {
        body: { phone: tx.phone_number, amount: tx.amount, transaction_id: tx.id, account_ref: `DASNET-${tx.order_number}` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "STK sent!", description: "Check your phone." });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    } catch (e: any) {
      toast({ title: "Retry failed", description: e.message, variant: "destructive" });
    } finally {
      setRetryingId(null);
    }
  };

  const buyAgain = (tx: Transaction) => {
    navigate(`/?package=${encodeURIComponent(tx.package_name)}`);
  };

  const maskPhone = (phone: string) => {
    if (!phone) return "";
    return phone.replace(/(\d{4})\d{3}(\d{3})/, "$1***$2");
  };

  const maskMeter = (meter: string) => {
    if (!meter) return "";
    if (meter.length <= 4) return meter;
    return meter.slice(0, 4) + "****" + meter.slice(-4);
  };

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Transaction[];
    },
  });

  const deleteTx = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast({ title: "Transaction deleted" });
    },
    onError: () => {
      toast({ title: "Cannot delete", description: "You may not have permission", variant: "destructive" });
    },
  });

  const filtered = transactions?.filter(
    (t) =>
      t.package_name.toLowerCase().includes(search.toLowerCase()) ||
      t.phone_number.includes(search) ||
      (t.service_number && t.service_number.includes(search)) ||
      (t.mpesa_reference && t.mpesa_reference.toLowerCase().includes(search.toLowerCase()))
  );

  const completed = transactions?.filter((t) => t.status === "completed").length || 0;
  const failed = transactions?.filter((t) => t.status === "failed").length || 0;
  const totalSpent =
    transactions?.filter((t) => t.status === "completed").reduce((s, t) => s + t.amount, 0) || 0;

  const StatusPill = ({ status }: { status: string }) => {
    if (status === "completed") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary">
          <CheckCircle2 className="w-3 h-3" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Completed</span>
        </span>
      );
    }
    if (status === "failed") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 border border-destructive/20 text-destructive">
          <XCircle className="w-3 h-3" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Failed</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning/10 border border-warning/20 text-warning">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span className="text-[10px] font-bold uppercase tracking-wider">Processing</span>
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/40">
        <div className="px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 group"
            aria-label="Back to home"
          >
            <div className="w-8 h-8 rounded-lg bg-secondary border border-border/60 flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/30 transition-colors">
              <ArrowLeft className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="text-left">
              <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground leading-none">Account</p>
              <h1 className="font-display font-bold text-sm leading-none mt-0.5">Order History</h1>
            </div>
          </button>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
            </span>
            <span className="text-[9px] font-bold text-primary uppercase tracking-[0.15em]">Live tracking</span>
          </span>
        </div>
      </header>

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="gradient-card rounded-xl p-3 hover:border-primary/30 transition-colors">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Completed</p>
              <CheckCircle2 className="w-3 h-3 text-primary" />
            </div>
            <p className="font-display text-lg font-extrabold text-primary leading-none">{completed}</p>
          </div>

          <div className="gradient-card rounded-xl p-3 hover:border-destructive/30 transition-colors">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Failed</p>
              <XCircle className="w-3 h-3 text-destructive" />
            </div>
            <p className="font-display text-lg font-extrabold text-destructive leading-none">{failed}</p>
          </div>

          <div className="gradient-card rounded-xl p-3 hover:border-primary/30 transition-colors">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Spent</p>
              <TrendingUp className="w-3 h-3 text-primary" />
            </div>
            <p className="font-display text-sm font-extrabold leading-none">
              <span className="text-primary text-[9px] mr-0.5">KSH</span>
              {totalSpent.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by product, phone, or M-Pesa ref..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-secondary/60 border border-border/60 text-sm focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Section header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-primary" />
            <h2 className="font-display font-bold text-xs uppercase tracking-[0.15em] text-foreground">
              Recent Orders
            </h2>
          </div>
          {filtered && filtered.length > 0 && (
            <span className="text-[10px] text-muted-foreground font-medium">
              {filtered.length} {filtered.length === 1 ? "order" : "orders"}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-7 h-7 text-primary animate-spin" />
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered?.map((tx) => (
              <div
                key={tx.id}
                className="gradient-card rounded-xl p-3.5 animate-slide-up hover:border-primary/30 transition-all"
              >
                {/* Row 1: icon + name | amount + status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <div className={`w-9 h-9 rounded-lg shrink-0 flex items-center justify-center border ${
                      tx.status === "completed"
                        ? "bg-primary/10 border-primary/20"
                        : tx.status === "failed"
                        ? "bg-destructive/10 border-destructive/20"
                        : "bg-warning/10 border-warning/20"
                    }`}>
                      <Receipt className={`w-4 h-4 ${
                        tx.status === "completed" ? "text-primary" : tx.status === "failed" ? "text-destructive" : "text-warning"
                      }`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display font-bold text-sm truncate">{tx.package_name}</h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wide">
                        {tx.category} · {format(new Date(tx.created_at), "MMM d, h:mm a")}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-display font-extrabold text-sm leading-none">
                      <span className="text-primary text-[9px] mr-0.5 font-bold">KSH</span>{tx.amount}
                    </p>
                    <div className="mt-1.5">
                      <StatusPill status={tx.status} />
                    </div>
                  </div>
                </div>

                {/* Row 2: meta + actions */}
                <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between gap-2">
                  <div className="text-[10px] text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
                    <span className="font-mono">{maskPhone(tx.phone_number)}</span>
                    {tx.meter_number && (
                      <span className="font-mono">· {maskMeter(tx.meter_number)}</span>
                    )}
                    {tx.mpesa_reference && (
                      <span className="text-primary font-mono font-semibold">· {tx.mpesa_reference}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => setSelectedTx(tx)}
                      className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteTx.mutate(tx.id)}
                      className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Failure reason */}
                {tx.failure_reason && (
                  <div className="mt-2.5 flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg bg-destructive/10 border border-destructive/20">
                    <XCircle className="w-3 h-3 text-destructive shrink-0 mt-0.5" />
                    <p className="text-[10px] text-destructive leading-snug">{tx.failure_reason}</p>
                  </div>
                )}

                {/* Action buttons by status */}
                {tx.status === "failed" && (
                  <div className="grid grid-cols-2 gap-1.5 mt-2.5">
                    <button
                      onClick={() => { setRetryTx(tx); setRetryPhone(""); }}
                      disabled={retryingId === tx.id}
                      className="text-[11px] py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary font-bold flex items-center justify-center gap-1.5 hover:bg-primary/15 disabled:opacity-50 transition-all"
                    >
                      {retryingId === tx.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Repeat className="w-3 h-3" />}
                      Retry STK
                    </button>
                    <button
                      onClick={() => setManualTx(tx)}
                      className="text-[11px] py-2 rounded-lg bg-warning/10 border border-warning/20 text-warning font-bold flex items-center justify-center gap-1.5 hover:bg-warning/15 transition-all"
                    >
                      <Wallet className="w-3 h-3" /> Pay via Till
                    </button>
                  </div>
                )}

                {tx.status === "completed" && (
                  <button
                    onClick={() => buyAgain(tx)}
                    className="w-full mt-2.5 text-[11px] py-2 rounded-lg bg-secondary/60 border border-border/60 text-foreground font-bold flex items-center justify-center gap-1.5 hover:bg-secondary hover:border-primary/30 transition-all"
                  >
                    <ShoppingCart className="w-3 h-3" /> Buy Again
                  </button>
                )}

                {(tx.status === "pending" || tx.status === "processing") && (
                  <button
                    onClick={() => navigate(`/order/${tx.id}`)}
                    className="w-full mt-2.5 text-[11px] py-2 rounded-lg bg-warning/10 border border-warning/20 text-warning font-bold hover:bg-warning/15 transition-all"
                  >
                    Track live status →
                  </button>
                )}
              </div>
            ))}

            {filtered?.length === 0 && (
              <div className="text-center py-16 gradient-card rounded-xl">
                <div className="w-12 h-12 rounded-full bg-secondary/60 border border-border/60 mx-auto flex items-center justify-center mb-3">
                  <Receipt className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold text-foreground">No orders yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {search ? "Try a different search term" : "Your purchases will appear here"}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedTx && (
        <TransactionDetailModal
          transaction={selectedTx}
          onClose={() => setSelectedTx(null)}
          onDelete={(id) => deleteTx.mutate(id)}
        />
      )}

      {manualTx && (
        <ManualPaymentModal
          transactionId={manualTx.id}
          phoneNumber={manualTx.phone_number}
          amount={manualTx.amount}
          packageName={manualTx.package_name}
          onClose={() => setManualTx(null)}
          onSubmitted={() => { setManualTx(null); queryClient.invalidateQueries({ queryKey: ["transactions"] }); }}
        />
      )}

      {retryTx && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl">
            <div className="p-4 border-b border-border">
              <p className="text-[10px] uppercase tracking-[0.15em] text-primary font-bold">Retry confirmation</p>
              <h3 className="font-display font-bold text-lg mt-1">Enter full number</h3>
              <p className="text-xs text-muted-foreground mt-1">
                To resend the STK push, type the full phone number for this order.
              </p>
            </div>

            <div className="p-4 space-y-3">
              <input
                type="tel"
                inputMode="numeric"
                placeholder="Enter full number"
                value={retryPhone}
                onChange={(e) => setRetryPhone(e.target.value)}
                className="w-full rounded-xl border border-border bg-secondary px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setRetryTx(null); setRetryPhone(""); }}
                  className="py-2.5 rounded-xl bg-secondary text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (formatPhoneTo254(retryPhone) !== retryTx.phone_number) {
                      return toast({ title: "Number mismatch", description: "Enter the full number exactly to continue.", variant: "destructive" });
                    }
                    await retryStk(retryTx);
                    setRetryTx(null);
                    setRetryPhone("");
                  }}
                  disabled={retryingId === retryTx.id}
                  className="py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50"
                >
                  {retryingId === retryTx.id ? "Sending..." : "Confirm retry"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default History;
