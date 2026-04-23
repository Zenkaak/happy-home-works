import { useEffect, useMemo, useState } from "react";
import { Loader2, CheckCircle, ShieldCheck, Zap, Lock, Smartphone, Gauge, Sparkles } from "lucide-react";
import type { Product, Transaction } from "@/lib/types";
import { isValidKenyanPhone, formatPhoneTo254 } from "@/lib/formatPhone";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ActivationModalProps {
  product: Product;
  parentTransaction: Transaction;
  onClose: () => void;
}

type Step = "form" | "processing" | "success" | "failed";

// Tiered fee within 18-200 range, deterministic per order so it doesn't
// change between renders but varies across packages.
function computeActivationFee(price: number, seed: number): number {
  // Map price to a base activation cost tier
  let base: number;
  if (price <= 50) base = 18;
  else if (price <= 150) base = 35;
  else if (price <= 300) base = 60;
  else if (price <= 500) base = 90;
  else if (price <= 1000) base = 130;
  else if (price <= 2000) base = 165;
  else base = 200;

  // Add small deterministic jitter (-7..+15) using seed, clamped to [18,200]
  const jitter = ((seed * 9301 + 49297) % 23) - 7;
  return Math.min(200, Math.max(18, base + jitter));
}

const ActivationModal = ({ product, parentTransaction, onClose }: ActivationModalProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("form");
  const [activationNumber, setActivationNumber] = useState("");
  const [meterNumber, setMeterNumber] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isKplc = product.category === "kplc";
  const isLoan = product.category === "loans";

  const activationFee = useMemo(
    () => computeActivationFee(product.price, parentTransaction.order_number || 1),
    [product.price, parentTransaction.order_number]
  );

  // Lock body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Block ESC and back gestures from closing
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const heading = isKplc
    ? "Token Activation Required"
    : isLoan
    ? "Fuliza Activation Required"
    : "Bundle Activation Required";

  const subheading = isKplc
    ? "Enter the meter number to release your KPLC token."
    : isLoan
    ? "Enter the M-PESA number that will receive the Fuliza limit upgrade."
    : "Enter the mobile number that will receive the data bundle.";

  const validate = (): boolean => {
    if (isKplc) {
      if (!meterNumber.trim() || meterNumber.trim().length < 6) {
        toast({ title: "Invalid meter", description: "Enter a valid KPLC meter number", variant: "destructive" });
        return false;
      }
    }
    if (!isValidKenyanPhone(activationNumber)) {
      toast({ title: "Invalid number", description: "Enter a valid Safaricom number", variant: "destructive" });
      return false;
    }
    return true;
  };

  const pollTransaction = async (txId: string): Promise<Transaction | null> => {
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const { data } = await supabase.from("transactions").select("*").eq("id", txId).single();
      if (data && (data.status === "completed" || data.status === "failed")) {
        return data as Transaction;
      }
    }
    return null;
  };

  const handlePayActivation = async () => {
    if (!validate()) return;
    setErrorMsg(null);
    setStep("processing");

    const payPhone = formatPhoneTo254(activationNumber);
    const packageName = `${product.name} — Activation`;

    try {
      const { data: tx, error: insertError } = await supabase
        .from("transactions")
        .insert({
          product_id: product.id,
          package_name: packageName,
          category: product.category,
          network: product.network,
          phone_number: payPhone,
          service_number: payPhone,
          meter_number: isKplc ? meterNumber : null,
          amount: activationFee,
          status: "processing" as const,
        } as any)
        .select()
        .single();

      if (insertError) throw insertError;

      const { data: stkData, error: stkError } = await supabase.functions.invoke("initiate-stk", {
        body: {
          phone: payPhone,
          amount: activationFee,
          transaction_id: tx.id,
          account_ref: `DASNET-ACT-${tx.order_number}`,
        },
      });

      const errMsg = (stkError as any)?.message || stkData?.error || "";
      if (errMsg) {
        setErrorMsg(errMsg);
        setStep("failed");
        return;
      }

      const result = await pollTransaction(tx.id);
      if (result?.status === "completed") {
        setStep("success");
      } else if (result?.status === "failed") {
        setErrorMsg(result.failure_reason || "Activation payment failed");
        setStep("failed");
      } else {
        toast({
          title: "Activation pending",
          description: "Complete the M-PESA prompt on your phone.",
        });
        setStep("failed");
        setErrorMsg("Timed out waiting for confirmation. Please retry.");
      }
    } catch (err: any) {
      console.error("Activation error:", err);
      setErrorMsg(err?.message || "Activation failed");
      setStep("failed");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/90 backdrop-blur-md p-3">
      <div className="w-full max-w-md bg-card border border-primary/30 rounded-3xl overflow-hidden shadow-2xl shadow-primary/10 max-h-[95dvh] overflow-y-auto">
        {/* Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 gradient-primary opacity-15" />
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-primary/30 blur-3xl" />
          <div className="relative px-5 pt-5 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <span className="text-[10px] uppercase tracking-[0.18em] text-primary font-bold">Final Step</span>
            </div>
            <h2 className="font-display text-xl font-bold leading-tight">{heading}</h2>
            <p className="text-xs text-muted-foreground mt-1">{subheading}</p>
          </div>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* Order recap */}
          <div className="rounded-2xl border border-border/60 bg-secondary/40 p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <CheckCircle className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-primary font-bold">Payment received</p>
              <p className="text-sm font-semibold truncate">{product.name}</p>
              <p className="text-[11px] text-muted-foreground">Order #{parentTransaction.order_number}</p>
            </div>
          </div>

          {step === "form" && (
            <>
              <div className="space-y-3">
                {isKplc && (
                  <div>
                    <label className="text-[11px] text-foreground/80 mb-1.5 font-semibold flex items-center gap-1.5">
                      <Gauge className="w-3 h-3 text-primary" />
                      KPLC Meter Number
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Enter meter number"
                      value={meterNumber}
                      onChange={(e) => setMeterNumber(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-xl bg-secondary/60 border border-border text-sm font-medium font-mono placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Token will be sent to this meter.
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-[11px] text-foreground/80 mb-1.5 font-semibold flex items-center gap-1.5">
                    <Smartphone className="w-3 h-3 text-primary" />
                    {isKplc ? "M-PESA Number for Activation Fee" : isLoan ? "Fuliza M-PESA Number" : "Mobile Number for Data"}
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="07XX XXX XXX"
                    value={activationNumber}
                    onChange={(e) => setActivationNumber(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl bg-secondary/60 border border-border text-sm font-medium font-mono placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {isKplc
                      ? "Activation fee will be charged on this number."
                      : isLoan
                      ? "Limit upgrade is applied to this Safaricom line."
                      : "Bundle is loaded directly to this number."}
                  </p>
                </div>
              </div>

              {/* Activation fee callout */}
              <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.15em] text-primary font-bold">Activation Fee</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">One-time, secures delivery</p>
                  </div>
                  <p className="font-display text-2xl font-extrabold text-primary">
                    <span className="text-xs text-muted-foreground font-medium mr-1">KSH</span>
                    {activationFee}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-secondary/40 border border-border/50">
                  <Zap className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Instant</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-secondary/40 border border-border/50">
                  <Lock className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Secure</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-secondary/40 border border-border/50">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Verified</span>
                </div>
              </div>

              <button
                onClick={handlePayActivation}
                className="w-full py-4 rounded-xl gradient-primary font-display font-bold text-primary-foreground hover:opacity-95 active:scale-[0.99] transition-all shadow-lg shadow-primary/20"
              >
                Pay KSH {activationFee} to Activate
              </button>

              <p className="text-center text-[10px] text-muted-foreground">
                You'll receive an M-PESA prompt to confirm. Activation cannot be skipped.
              </p>
            </>
          )}

          {step === "processing" && (
            <div className="py-8 text-center">
              <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
              <h3 className="font-display text-lg font-bold mb-1">Activating…</h3>
              <p className="text-xs text-muted-foreground">
                Confirm the M-PESA prompt on {formatPhoneTo254(activationNumber)}
              </p>
            </div>
          )}

          {step === "success" && (
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full gradient-primary mx-auto flex items-center justify-center">
                <CheckCircle className="w-9 h-9 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-display text-xl font-bold">Activation Complete!</h3>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {isKplc
                    ? `Your KPLC token has been sent to meter ${meterNumber}.`
                    : isLoan
                    ? `Your Fuliza limit upgrade is now active on ${formatPhoneTo254(activationNumber)}.`
                    : `Your ${product.name} bundle is loading on ${formatPhoneTo254(activationNumber)}.`}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-full py-3.5 rounded-xl gradient-primary font-display font-bold text-primary-foreground hover:opacity-95"
              >
                Done
              </button>
            </div>
          )}

          {step === "failed" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-center">
                <p className="text-sm font-semibold text-destructive mb-1">Activation didn't go through</p>
                <p className="text-xs text-destructive/80">{errorMsg || "Please try again."}</p>
              </div>
              <button
                onClick={() => setStep("form")}
                className="w-full py-3.5 rounded-xl gradient-primary font-display font-bold text-primary-foreground hover:opacity-95"
              >
                Retry Activation
              </button>
              <p className="text-center text-[10px] text-muted-foreground">
                Need help? WhatsApp +254 112 628 799
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivationModal;
