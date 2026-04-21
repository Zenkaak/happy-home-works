import { useEffect, useState } from "react";
import { X, AlertTriangle, Loader2, CheckCircle, XCircle, Wallet, ShieldCheck, Zap, Lock, Phone, Smartphone } from "lucide-react";
import ManualPaymentModal from "@/components/ManualPaymentModal";
import type { Product, Transaction } from "@/lib/types";
import { isValidKenyanPhone, formatPhoneTo254 } from "@/lib/formatPhone";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CheckoutModalProps {
  product: Product;
  onClose: () => void;
  referralCode?: string;
}

type Step = "form" | "confirm" | "processing" | "success" | "failed" | "banned";

const CheckoutModal = ({ product, onClose, referralCode }: CheckoutModalProps) => {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("form");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [serviceNumber, setServiceNumber] = useState("");
  const [meterNumber, setMeterNumber] = useState("");
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);

  const needsPaymentNumber =
    product.category === "data" && product.network !== "safaricom";
  const needsMeter = product.category === "kplc";
  const isLoan = product.category === "loans";
  const modalMaxHeight = viewportHeight ? `${Math.max(viewportHeight - 12, 320)}px` : "calc(100dvh - 0.75rem)";

  useEffect(() => {
    const updateViewport = () => {
      const nextHeight = window.visualViewport?.height || window.innerHeight;
      setViewportHeight(nextHeight);
    };

    updateViewport();

    const visualViewport = window.visualViewport;
    visualViewport?.addEventListener("resize", updateViewport);
    visualViewport?.addEventListener("scroll", updateViewport);
    window.addEventListener("resize", updateViewport);

    return () => {
      visualViewport?.removeEventListener("resize", updateViewport);
      visualViewport?.removeEventListener("scroll", updateViewport);
      window.removeEventListener("resize", updateViewport);
    };
  }, []);

  const validate = () => {
    if (!isValidKenyanPhone(phoneNumber)) {
      toast({ title: "Invalid phone number", description: "Enter a valid Kenyan phone number", variant: "destructive" });
      return false;
    }
    if (needsPaymentNumber && !isValidKenyanPhone(serviceNumber)) {
      toast({ title: "Invalid Safaricom number", description: "Enter a valid Safaricom payment number", variant: "destructive" });
      return false;
    }
    if (needsMeter && !meterNumber.trim()) {
      toast({ title: "Meter number required", description: "Enter your KPLC meter number", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleConfirmPay = async () => {
    setStep("processing");
    try {
      const payPhone = needsPaymentNumber ? formatPhoneTo254(serviceNumber) : formatPhoneTo254(phoneNumber);

      const { data, error } = await supabase.from("transactions").insert({
        product_id: product.id,
        package_name: product.name,
        category: product.category,
        network: product.network,
        phone_number: formatPhoneTo254(phoneNumber),
        service_number: needsPaymentNumber ? formatPhoneTo254(serviceNumber) : formatPhoneTo254(phoneNumber),
        meter_number: needsMeter ? meterNumber : null,
        amount: product.price,
        status: "processing" as const,
        referral_code: referralCode || null,
      } as any).select().single();

      if (error) throw error;

      // Call STK push edge function
      const { data: stkData, error: stkError } = await supabase.functions.invoke("initiate-stk", {
        body: {
          phone: payPhone,
          amount: product.price,
          transaction_id: data.id,
          account_ref: `DASNET-${data.order_number}`,
        },
      });

      // Detect banned response (403 from edge fn) – may surface as error or in stkData.error
      const errMsg = (stkError as any)?.message || stkData?.error || "";
      if (errMsg && /not permitted|banned/i.test(errMsg)) {
        setStep("banned");
        return;
      }

      if (stkError) throw stkError;

      const pollResult = await pollTransaction(data.id);
      setTransaction(pollResult);

      if (pollResult.status === "completed") {
        setStep("success");
      } else if (pollResult.status === "failed") {
        setStep("failed");
      } else {
        toast({
          title: "Payment submitted",
          description: "Complete the prompt on your phone. We will update the status shortly.",
        });
        onClose();
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      const msg = err?.message || "";
      if (/not permitted|banned/i.test(msg)) {
        setStep("banned");
        return;
      }
      setStep("failed");
    }
  };

  const pollTransaction = async (txId: string): Promise<Transaction> => {
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const { data } = await supabase
        .from("transactions")
        .select("*")
        .eq("id", txId)
        .single();
      if (data && (data.status === "completed" || data.status === "failed")) {
        return data as Transaction;
      }
    }
    // Timeout: keep current transaction state so callback can complete it
    const { data } = await supabase.from("transactions").select("*").eq("id", txId).single();
    return (data || { status: "processing" }) as Transaction;
  };

  if (step === "processing") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
        <div className="w-full max-w-md gradient-card rounded-2xl p-8 text-center">
          <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
          <h2 className="font-display text-xl font-bold mb-2">Processing Payment</h2>
          <p className="text-muted-foreground text-sm">
            Check your phone for the M-Pesa STK prompt...
          </p>
          <p className="text-xs text-muted-foreground mt-4">Do not close this page</p>
        </div>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
        <div className="w-full max-w-md bg-card rounded-2xl overflow-hidden">
          <div className="gradient-receipt p-8 text-center">
            <CheckCircle className="w-14 h-14 text-primary-foreground mx-auto mb-3" />
            <h2 className="font-display text-2xl font-bold text-primary-foreground">Payment Received!</h2>
            <span className="inline-block mt-2 px-3 py-1 rounded-full bg-primary-foreground/20 text-primary-foreground text-xs font-bold">
              COMPLETED
            </span>
          </div>
          <div className="p-6">
            <p className="text-sm text-center text-muted-foreground mb-4">
              Thank you for your purchase! Your <strong className="text-foreground">{product.name}</strong> is being activated on {formatPhoneTo254(phoneNumber)}.
            </p>
            <div className="space-y-3 mb-6">
              <h3 className="text-xs font-bold tracking-wider text-primary flex items-center gap-2">
                📋 TRANSACTION SUMMARY
              </h3>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Order ID</span>
                <span className="font-medium">#{transaction?.order_number}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Service</span>
                <span className="font-medium">{product.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Recipient</span>
                <span className="font-medium">{formatPhoneTo254(phoneNumber)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-border pt-3">
                <span className="text-muted-foreground">Total Paid</span>
                <span className="text-xl font-bold">Ksh {product.price}</span>
              </div>
              {transaction?.mpesa_reference && (
                <div>
                  <p className="text-[10px] text-primary uppercase tracking-wider mb-1">M-PESA RECEIPT</p>
                  <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2">
                    <span className="text-sm font-mono">{transaction.mpesa_reference}</span>
                    <button onClick={() => navigator.clipboard.writeText(transaction.mpesa_reference || "")} className="ml-auto text-muted-foreground hover:text-foreground">
                      📋
                    </button>
                  </div>
                </div>
              )}
              {transaction?.kplc_token && (
                <div>
                  <p className="text-[10px] text-warning uppercase tracking-wider mb-1">KPLC TOKEN</p>
                  <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2">
                    <span className="text-sm font-mono font-bold tracking-widest">{transaction.kplc_token}</span>
                    <button onClick={() => navigator.clipboard.writeText(transaction.kplc_token || "")} className="ml-auto text-muted-foreground hover:text-foreground">
                      📋
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-secondary font-medium text-sm hover:bg-muted transition-colors">
                Print
              </button>
              <button onClick={onClose} className="flex-1 py-3 rounded-xl gradient-primary font-bold text-sm text-primary-foreground hover:opacity-90 transition-opacity">
                Done
              </button>
            </div>
            <p className="text-center text-xs text-primary mt-4">
              ✅ Verified Digital Receipt by DASNET
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (step === "banned") {
    const reviewMsg = encodeURIComponent(
      `Hello DASNET, my number ${formatPhoneTo254(phoneNumber)} is restricted from making payments. Please review my account.`
    );
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
        <div className="w-full max-w-md bg-card rounded-2xl overflow-hidden">
          <div className="bg-destructive/90 p-8 text-center">
            <Lock className="w-14 h-14 text-destructive-foreground mx-auto mb-3" />
            <h2 className="font-display text-2xl font-bold text-destructive-foreground">Account Restricted</h2>
            <span className="inline-block mt-2 px-3 py-1 rounded-full bg-destructive-foreground/20 text-destructive-foreground text-xs font-bold">
              BANNED
            </span>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-foreground text-center">
              The number <span className="font-bold">{formatPhoneTo254(phoneNumber)}</span> is currently
              restricted from making payments on DASNET.
            </p>
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive">
              No charges were attempted. If you believe this is a mistake, request a review and our team will get back to you.
            </div>
            <div className="space-y-2">
              <a
                href={`https://wa.me/254112628799?text=${reviewMsg}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90"
              >
                <ShieldCheck className="w-4 h-4" />
                Request Account Review
              </a>
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl border border-border font-medium text-sm"
              >
                Close
              </button>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              Support: WhatsApp +254 112 628 799
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (step === "failed") {
    const failureReason = transaction?.failure_reason || "Payment could not be processed";
    const failureReasonMap: Record<string, { label: string; icon: string }> = {
      "The balance is insufficient for the transaction.": { label: "Insufficient M-Pesa Balance", icon: "💰" },
      "Request cancelled by user": { label: "Cancelled by User", icon: "🚫" },
      "The service request is processed successfully.": { label: "Request Timeout", icon: "⏱️" },
      "Payment timeout": { label: "Payment Timeout", icon: "⏱️" },
    };
    const mapped = failureReasonMap[failureReason] || { label: failureReason, icon: "⚠️" };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
        <div className="w-full max-w-md bg-card rounded-2xl overflow-hidden">
          <div className="bg-destructive/90 p-8 text-center">
            <XCircle className="w-14 h-14 text-destructive-foreground mx-auto mb-3" />
            <h2 className="font-display text-2xl font-bold text-destructive-foreground">Transaction Failed</h2>
            <span className="inline-block mt-2 px-3 py-1 rounded-full bg-destructive-foreground/20 text-destructive-foreground text-xs font-bold">
              FAILED
            </span>
          </div>
          <div className="p-6">
            <div className="space-y-3 mb-6">
              <h3 className="text-xs font-bold tracking-wider text-destructive flex items-center gap-2">
                📋 TRANSACTION DETAILS
              </h3>
              {transaction?.order_number && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Order ID</span>
                  <span className="font-medium">#{transaction.order_number}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Service</span>
                <span className="font-medium">{product.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Recipient</span>
                <span className="font-medium">{formatPhoneTo254(phoneNumber)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium">KSH {product.price}</span>
              </div>
              <div className="border-t border-border pt-3">
                <p className="text-[10px] text-destructive uppercase tracking-wider mb-1">FAILURE REASON</p>
                <div className="flex items-center gap-2 bg-destructive/10 rounded-lg px-3 py-2 border border-destructive/20">
                  <span>{mapped.icon}</span>
                  <span className="text-sm font-medium text-destructive">{mapped.label}</span>
                </div>
              </div>
              {transaction?.mpesa_reference && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">M-PESA REFERENCE</p>
                  <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2">
                    <span className="text-sm font-mono">{transaction.mpesa_reference}</span>
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground text-center mb-4">
              No charges were made. Try again with M-PESA or pay manually via Till.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => setShowManual(true)}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90"
              >
                <Wallet className="w-4 h-4" />
                Pay via Till 8448104 (Dasnet Ventures)
              </button>
              <div className="flex gap-2">
                <button onClick={() => setStep("confirm")} className="flex-1 py-2.5 rounded-xl bg-secondary font-medium text-sm hover:bg-muted">
                  Retry STK
                </button>
                <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-border font-medium text-sm">
                  Close
                </button>
              </div>
            </div>
            <p className="text-center text-xs text-muted-foreground mt-4">
              Need help? WhatsApp +254112628799
            </p>
          </div>
        </div>
        {showManual && transaction && (
          <ManualPaymentModal
            transactionId={transaction.id}
            phoneNumber={formatPhoneTo254(phoneNumber)}
            amount={product.price}
            packageName={product.name}
            onClose={() => setShowManual(false)}
            onSubmitted={() => { setShowManual(false); onClose(); }}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-md animate-in fade-in duration-200 px-2 py-2 sm:p-4"
      style={{ height: viewportHeight ? `${viewportHeight}px` : "100dvh" }}
    >
      <div
        className="w-full max-w-md bg-card border border-border/60 rounded-3xl overflow-y-auto overscroll-contain shadow-2xl shadow-black/40 animate-in slide-in-from-bottom-4 duration-300"
        style={{ maxHeight: modalMaxHeight, paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
      >
        {/* Welcoming gradient header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 gradient-primary opacity-10" />
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative flex items-start justify-between px-5 pt-5 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                </div>
                <span className="text-[10px] uppercase tracking-[0.15em] text-primary font-bold">Secure Checkout</span>
              </div>
              <h2 className="font-display text-xl font-bold text-foreground leading-tight">
                {step === "form" ? "Almost there 👋" : "Review your order"}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {step === "form" ? "Enter your details to receive your bundle instantly." : "Confirm everything looks right."}
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary/80 transition-colors -mr-1 -mt-1">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* Product summary card */}
          <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/8 via-card to-card p-4">
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-primary uppercase tracking-[0.15em] font-bold">
                  {product.category === "data" ? `${product.network?.toUpperCase()} BUNDLE` : product.category === "kplc" ? "KPLC TOKEN" : "LOAN UPGRADE"}
                </p>
                <p className="font-display font-bold text-base mt-1 truncate">{product.name}</p>
                {product.description && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{product.description}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</p>
                <p className="font-display text-2xl font-extrabold text-foreground leading-none mt-0.5">
                  <span className="text-xs text-muted-foreground font-medium">KSH</span> {product.price}
                </p>
              </div>
            </div>
          </div>

          {isLoan && (
            <div className="flex items-start gap-2.5 bg-warning/10 rounded-xl p-3 border border-warning/30">
              <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
              <p className="text-xs text-warning/90 leading-relaxed">
                You are upgrading your Fuliza/M-Shwari/KCB limit. {product.description}
              </p>
            </div>
          )}

          {step === "form" && (
            <>
              <div className="space-y-3">
                {needsPaymentNumber && (
                  <div>
                    <label className="block text-[11px] text-foreground/80 mb-1.5 font-semibold flex items-center gap-1.5">
                      <Smartphone className="w-3 h-3 text-primary" />
                      Safaricom Payment Number
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      placeholder="07XX XXX XXX"
                      value={serviceNumber}
                      onChange={(e) => setServiceNumber(e.target.value)}
                      onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ block: "center", behavior: "smooth" }), 300)}
                      className="w-full px-4 py-3.5 rounded-xl bg-secondary/60 border border-border text-sm font-medium placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] text-foreground/80 mb-1.5 font-semibold flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-primary" />
                    {product.category === "kplc"
                      ? "M-Pesa Payment Number"
                      : needsPaymentNumber
                      ? `${product.network === "airtel" ? "Airtel" : "Telkom"} Receiving Number`
                      : "Phone Number"}
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="07XX XXX XXX"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ block: "center", behavior: "smooth" }), 300)}
                    className="w-full px-4 py-3.5 rounded-xl bg-secondary/60 border border-border text-sm font-medium placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                  />
                </div>

                {needsMeter && (
                  <div>
                    <label className="block text-[11px] text-foreground/80 mb-1.5 font-semibold">
                      KPLC Meter Number
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Enter meter number"
                      value={meterNumber}
                      onChange={(e) => setMeterNumber(e.target.value)}
                      onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ block: "center", behavior: "smooth" }), 300)}
                      className="w-full px-4 py-3.5 rounded-xl bg-secondary/60 border border-border text-sm font-medium placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all"
                    />
                  </div>
                )}
              </div>

              {/* Trust badges */}
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
                onClick={() => {
                  if (validate()) setStep("confirm");
                }}
                className="w-full py-4 rounded-xl gradient-primary font-display font-bold text-primary-foreground hover:opacity-95 active:scale-[0.99] transition-all shadow-lg shadow-primary/20"
              >
                Continue to Payment →
              </button>

              <p className="text-center text-[10px] text-muted-foreground">
                By continuing you agree to receive an M-PESA prompt for KSH {product.price}.
              </p>
            </>
          )}

          {step === "confirm" && (
            <>
              <div className="rounded-2xl bg-secondary/40 border border-border/60 divide-y divide-border/60">
                <div className="flex justify-between items-center px-4 py-3">
                  <span className="text-xs text-muted-foreground">Service</span>
                  <span className="text-sm font-semibold text-right">{product.name}</span>
                </div>
                {product.network && (
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-xs text-muted-foreground">Network</span>
                    <span className="text-sm font-semibold capitalize">{product.network}</span>
                  </div>
                )}
                <div className="flex justify-between items-center px-4 py-3">
                  <span className="text-xs text-muted-foreground">Phone</span>
                  <span className="text-sm font-semibold font-mono">{formatPhoneTo254(phoneNumber)}</span>
                </div>
                {needsPaymentNumber && (
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-xs text-muted-foreground">Payment Number</span>
                    <span className="text-sm font-semibold font-mono">{formatPhoneTo254(serviceNumber)}</span>
                  </div>
                )}
                {needsMeter && (
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-xs text-muted-foreground">Meter</span>
                    <span className="text-sm font-semibold font-mono">{meterNumber}</span>
                  </div>
                )}
                <div className="flex justify-between items-center px-4 py-4 bg-primary/5">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total Payable</span>
                  <span className="font-display text-2xl font-extrabold text-primary">
                    <span className="text-xs text-muted-foreground font-medium mr-1">KSH</span>{product.price}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-primary/5 rounded-xl p-3 border border-primary/15">
                <Lock className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                <p className="text-[11px] text-foreground/80 leading-relaxed">
                  Tap <span className="font-semibold">Confirm & Pay</span> to receive an M-PESA prompt on <span className="font-semibold font-mono">{formatPhoneTo254(needsPaymentNumber ? serviceNumber : phoneNumber)}</span>.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("form")}
                  className="flex-1 py-3.5 rounded-xl bg-secondary border border-border/60 font-semibold text-sm hover:bg-muted transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleConfirmPay}
                  className="flex-[2] py-3.5 rounded-xl gradient-primary font-display font-bold text-sm text-primary-foreground hover:opacity-95 active:scale-[0.99] transition-all shadow-lg shadow-primary/20"
                >
                  Confirm & Pay
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;
