import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Search, CheckCircle, XCircle, Loader2, QrCode, Eye, Trash2, Repeat, Wallet, ShoppingCart, Sparkles } from "lucide-react";
import Footer from "@/components/Footer";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import type { Product, Transaction } from "@/lib/types";
import TransactionDetailModal from "@/components/TransactionDetailModal";
import ManualPaymentModal from "@/components/ManualPaymentModal";
import ActivationModal from "@/components/ActivationModal";
import { useToast } from "@/hooks/use-toast";
import { formatPhoneTo254 } from "@/lib/formatPhone";

const History = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [manualTx, setManualTx] = useState<Transaction | null>(null);
  const [activationTx, setActivationTx] = useState<Transaction | null>(null);
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

  // Mask phone numbers like 0723***545
  const maskPhone = (phone: string) => {
    if (!phone) return "";
    return phone.replace(/(\d{4})\d{3}(\d{3})/, "$1***$2");
  };

  // Mask meter numbers like 1234****5678
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
      toast({
        title: "Cannot delete",
        description: "You may not have permission",
        variant: "destructive",
      });
    },
  });

  const filtered = transactions?.filter(
    (t) =>
      t.package_name.toLowerCase().includes(search.toLowerCase()) ||
      t.phone_number.includes(search) ||
      (t.service_number && t.service_number.includes(search)) ||
      (t.mpesa_reference &&
        t.mpesa_reference.toLowerCase().includes(search.toLowerCase()))
  );

  // Set of "{package_name}|{phone_number}" pairs that have a completed activation row.
  const activatedKeys = useMemo(() => {
    const set = new Set<string>();
    transactions?.forEach((t) => {
      if (t.status === "completed" && t.package_name.endsWith(" — Activation")) {
        const parentName = t.package_name.replace(/ — Activation$/, "");
        set.add(`${parentName}|${t.phone_number}`);
      }
    });
    return set;
  }, [transactions]);

  const isActivated = (tx: Transaction) =>
    tx.package_name.endsWith(" — Activation") ||
    activatedKeys.has(`${tx.package_name}|${tx.phone_number}`) ||
    activatedKeys.has(`${tx.package_name}|${tx.service_number || ""}`);

  // Stats
  const completed =
    transactions?.filter((t) => t.status === "completed").length || 0;

  const failed =
    transactions?.filter((t) => t.status === "failed").length || 0;

  const totalSpent =
    transactions
      ?.filter((t) => t.status === "completed")
      .reduce((s, t) => s + t.amount, 0) || 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass px-4 py-3">
        <div className="container flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            HISTORY
          </button>

          <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-accent/20 text-accent text-xs font-bold">
            🕐 TRACKING ORDERS
          </span>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="gradient-card rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-primary">{completed}</p>
            <p className="text-[10px] text-muted-foreground uppercase">
              Completed
            </p>
          </div>

          <div className="gradient-card rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-destructive">{failed}</p>
            <p className="text-[10px] text-muted-foreground uppercase">
              Failed
            </p>
          </div>

          <div className="gradient-card rounded-xl p-3 text-center">
            <p className="text-lg font-bold">
              KSH {totalSpent.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase">
              Total
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
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {filtered?.map((tx) => (
              <div
                key={tx.id}
                className="gradient-card rounded-xl p-4 animate-slide-up"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                      <QrCode className="w-5 h-5 text-muted-foreground" />
                    </div>

                    <div>
                      <h3 className="font-bold text-sm">{tx.package_name}</h3>

                      <p className="text-xs text-muted-foreground">
                        {tx.category.toUpperCase()} •{" "}
                        {format(new Date(tx.created_at), "MMM d, h:mm a")}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-bold">Ksh {tx.amount}</p>

                    <div className="flex items-center gap-1 mt-1">
                      {tx.status === "completed" ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5 text-primary" />
                          <span className="text-xs text-primary font-medium">
                            Completed
                          </span>
                        </>
                      ) : tx.status === "failed" ? (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-destructive" />
                          <span className="text-xs text-destructive font-medium">
                            Failed
                          </span>
                        </>
                      ) : (
                        <>
                          <Loader2 className="w-3.5 h-3.5 text-warning animate-spin" />
                          <span className="text-xs text-warning font-medium">
                            Processing
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Extra info row */}
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    <span>PHONE: {maskPhone(tx.phone_number)}</span>

                    {tx.meter_number && (
                      <span className="ml-2">• Meter: {maskMeter(tx.meter_number)}</span>
                    )}
                    {tx.mpesa_reference && (
                      <span className="ml-2 text-primary font-mono">
                        • {tx.mpesa_reference}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedTx(tx)}
                      className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    </button>

                    <button
                      onClick={() => deleteTx.mutate(tx.id)}
                      className="p-1.5 rounded-lg hover:bg-destructive/20 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </div>

                {/* Failure reason */}
                {tx.failure_reason && (
                  <p className="text-xs text-destructive mt-2 bg-destructive/10 rounded-lg px-2 py-1">
                    ⚠️ {tx.failure_reason}
                  </p>
                )}

                {/* Action buttons by status */}
                {tx.status === "failed" && (
                  <div className="grid grid-cols-2 gap-1.5 mt-2">
                     <button
                       onClick={() => {
                         setRetryTx(tx);
                         setRetryPhone("");
                       }}
                      disabled={retryingId === tx.id}
                      className="text-[11px] py-1.5 rounded-lg bg-primary/10 text-primary font-semibold flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      {retryingId === tx.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Repeat className="w-3 h-3" />} Retry
                    </button>
                    <button
                      onClick={() => setManualTx(tx)}
                      className="text-[11px] py-1.5 rounded-lg bg-warning/10 text-warning font-semibold flex items-center justify-center gap-1"
                    >
                      <Wallet className="w-3 h-3" /> Pay via Till
                    </button>
                  </div>
                )}

                {tx.status === "completed" && (
                  <button
                    onClick={() => buyAgain(tx)}
                    className="w-full mt-2 text-[11px] py-1.5 rounded-lg bg-secondary text-foreground font-semibold flex items-center justify-center gap-1 hover:bg-secondary/80"
                  >
                    <ShoppingCart className="w-3 h-3" /> Buy Again
                  </button>
                )}

                {(tx.status === "pending" || tx.status === "processing") && (
                  <button
                    onClick={() => navigate(`/order/${tx.id}`)}
                    className="w-full mt-2 text-[11px] py-1.5 rounded-lg bg-warning/10 text-warning font-semibold"
                  >
                    Track live status →
                  </button>
                )}
              </div>
            ))}

            {filtered?.length === 0 && (
              <p className="text-center text-muted-foreground py-12">
                No transactions found
              </p>
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
                  onClick={() => {
                    setRetryTx(null);
                    setRetryPhone("");
                  }}
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
