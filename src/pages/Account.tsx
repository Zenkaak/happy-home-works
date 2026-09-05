import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  ArrowLeft,
  Loader2,
  LogOut,
  Phone,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Wifi,
  Zap,
  Wallet,
  Repeat,
  Sparkles,
} from "lucide-react";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { isValidKenyanPhone, formatPhoneDisplay } from "@/lib/formatPhone";
import { buildAccountRef } from "@/lib/accountRef";
import { initiateStkPush } from "@/lib/stk";

const TOKEN_KEY = "dasnet_customer_token";

interface Order {
  id: string;
  order_number: number;
  package_name: string;
  category: string;
  network: string | null;
  amount: number;
  status: string;
  mpesa_reference: string | null;
  kplc_token: string | null;
  meter_number: string | null;
  service_number: string | null;
  failure_reason: string | null;
  activation_amount: number | null;
  created_at: string;
}

const callAuth = async (body: Record<string, unknown>, token?: string) => {
  const { data, error } = await supabase.functions.invoke("customer-auth", {
    body,
    headers: token ? { "x-customer-token": token } : undefined,
  });
  if (error) {
    let details = error.message;
    try {
      const ctx = (error as any).context;
      if (ctx?.text) {
        const raw = await ctx.text();
        const parsed = JSON.parse(raw);
        details = parsed?.error || raw;
      }
    } catch {
      /* keep default message */
    }
    throw new Error(details);
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as any;
};

const categoryMeta = (category: string) => {
  if (category === "kplc") return { label: "KPLC Token", Icon: Zap };
  if (category === "loans") return { label: "Fuliza Upgrade", Icon: Wallet };
  return { label: "Data Bundle", Icon: Wifi };
};

const statusMeta = (status: string) => {
  if (status === "completed")
    return { label: "Active", cls: "text-primary bg-primary/10 border-primary/30", Icon: CheckCircle2 };
  if (status === "awaiting_activation")
    return { label: "Activation Ready", cls: "text-warning bg-warning/10 border-warning/40", Icon: Sparkles };
  if (status === "failed")
    return { label: "Failed", cls: "text-destructive bg-destructive/10 border-destructive/30", Icon: XCircle };
  return { label: "Pending", cls: "text-muted-foreground bg-secondary border-border", Icon: Clock };
};

const Account = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<"phone" | "code" | "dashboard">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [accountPhone, setAccountPhone] = useState("");
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const loadOrders = async (token: string) => {
    setLoadingOrders(true);
    try {
      const res = await callAuth({ action: "me" }, token);
      setOrders(res.orders || []);
      setAccountPhone(res.phone || "");
      setStep("dashboard");
    } catch (e: any) {
      localStorage.removeItem(TOKEN_KEY);
      setStep("phone");
      if (e.message !== "Session expired") {
        toast({ title: "Could not load your account", description: e.message, variant: "destructive" });
      }
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) loadOrders(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestCode = async () => {
    if (!isValidKenyanPhone(phone)) {
      toast({ title: "Invalid number", description: "Enter a valid Safaricom or Airtel number.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await callAuth({ action: "request_otp", phone });
      setStep("code");
      toast({ title: "Code sent", description: "Check your SMS for the 6-digit code." });
    } catch (e: any) {
      toast({ title: "Could not send code", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    if (code.trim().length < 4) {
      toast({ title: "Enter the code", description: "Type the 6-digit code from your SMS.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const res = await callAuth({ action: "verify_otp", phone, code: code.trim() });
      localStorage.setItem(TOKEN_KEY, res.token);
      setCode("");
      await loadOrders(res.token);
    } catch (e: any) {
      toast({ title: "Verification failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
    setOrders([]);
    setStep("phone");
    setPhone("");
    if (token) {
      try {
        await callAuth({ action: "logout" }, token);
      } catch {
        /* session already gone */
      }
    }
  };

  const retry = async (order: Order) => {
    const payAmount =
      order.status === "awaiting_activation" && order.activation_amount
        ? order.activation_amount
        : order.amount;
    setRetryingId(order.id);
    try {
      await initiateStkPush({
        phone: accountPhone,
        amount: payAmount,
        transaction_id: order.id,
        account_ref: buildAccountRef({ category: order.category, packageName: order.package_name }),
      });
      toast({ title: "Payment request sent", description: "Enter your M-PESA PIN on your phone." });
    } catch (e: any) {
      toast({ title: "Retry failed", description: e.message, variant: "destructive" });
    } finally {
      setRetryingId(null);
    }
  };

  const active = orders.filter((o) => o.status === "completed");
  const pendingFuliza = orders.filter((o) => o.category === "loans" && o.status !== "completed");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 glass px-4 py-3">
        <div className="container flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-sm font-semibold">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="font-display font-bold text-base">My Account</h1>
          {step === "dashboard" ? (
            <button onClick={logout} className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <LogOut className="w-4 h-4" /> Log out
            </button>
          ) : (
            <span className="w-12" />
          )}
        </div>
      </header>

      <main className="container flex-1 px-4 py-6">
        {step !== "dashboard" && (
          <div className="mx-auto max-w-sm rounded-2xl border border-border bg-card p-6 shadow-lg animate-slide-up">
            <div className="mb-5 flex flex-col items-center text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl gradient-primary">
                <ShieldCheck className="h-6 w-6 text-primary-foreground" />
              </div>
              <h2 className="font-display text-lg font-bold">
                {step === "phone" ? "Sign in with your number" : "Enter your code"}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {step === "phone"
                  ? "We'll text you a 6-digit code to confirm it's you."
                  : `Code sent to ${formatPhoneDisplay(phone)}`}
              </p>
            </div>

            {step === "phone" ? (
              <>
                <div className="relative mb-4">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && requestCode()}
                    inputMode="tel"
                    placeholder="07XX XXX XXX"
                    className="w-full rounded-xl border border-border bg-secondary py-3 pl-9 pr-3 text-sm outline-none focus:border-primary"
                  />
                </div>
                <button
                  onClick={requestCode}
                  disabled={busy}
                  className="w-full rounded-xl gradient-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
                >
                  {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Send code"}
                </button>
              </>
            ) : (
              <>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  onKeyDown={(e) => e.key === "Enter" && verifyCode()}
                  inputMode="numeric"
                  placeholder="••••••"
                  className="mb-4 w-full rounded-xl border border-border bg-secondary py-3 text-center text-xl font-bold tracking-[0.4em] outline-none focus:border-primary"
                />
                <button
                  onClick={verifyCode}
                  disabled={busy}
                  className="w-full rounded-xl gradient-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
                >
                  {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Verify & continue"}
                </button>
                <button
                  onClick={() => setStep("phone")}
                  className="mt-3 w-full text-xs font-semibold text-muted-foreground"
                >
                  Use a different number
                </button>
              </>
            )}
          </div>
        )}

        {step === "dashboard" && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-primary/30 bg-[linear-gradient(160deg,hsl(var(--primary)/0.12),hsl(var(--card)))] p-4">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Signed in as</p>
              <p className="font-display text-xl font-bold">{formatPhoneDisplay(accountPhone)}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border border-border bg-card/60 py-2">
                  <p className="font-display text-base font-bold">{active.length}</p>
                  <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Active</p>
                </div>
                <div className="rounded-lg border border-border bg-card/60 py-2">
                  <p className="font-display text-base font-bold">{pendingFuliza.length}</p>
                  <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Pending Fuliza</p>
                </div>
                <div className="rounded-lg border border-border bg-card/60 py-2">
                  <p className="font-display text-base font-bold">{orders.length}</p>
                  <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Orders</p>
                </div>
              </div>
            </div>

            {loadingOrders ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : orders.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-8 text-center">
                <p className="text-sm font-semibold">No purchases yet</p>
                <p className="mt-1 text-xs text-muted-foreground">Your bundles and tokens will appear here.</p>
                <button
                  onClick={() => navigate("/")}
                  className="mt-4 rounded-xl gradient-primary px-4 py-2.5 text-xs font-bold text-primary-foreground"
                >
                  Browse offers
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((o) => {
                  const { label, Icon } = categoryMeta(o.category);
                  const st = statusMeta(o.status);
                  return (
                    <div key={o.id} className="rounded-xl border border-border bg-card p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-display text-sm font-bold leading-tight">{o.package_name}</p>
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              {label} · #{o.order_number}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${st.cls}`}
                        >
                          <st.Icon className="h-3 w-3" /> {st.label}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <p className="text-muted-foreground">Amount</p>
                          <p className="font-semibold">KSH {o.amount}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Expiry</p>
                          <p className="font-semibold">
                            {o.category === "data" ? "No expiry" : o.category === "kplc" ? "One-off" : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Date</p>
                          <p className="font-semibold">{format(new Date(o.created_at), "dd MMM yyyy, HH:mm")}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Ref</p>
                          <p className="font-semibold truncate">{o.mpesa_reference || "—"}</p>
                        </div>
                      </div>

                      {o.kplc_token && (
                        <div className="mt-3 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2">
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">KPLC Token</p>
                          <p className="font-display text-sm font-bold tracking-wider">{o.kplc_token}</p>
                        </div>
                      )}

                      {o.status === "failed" && o.failure_reason && (
                        <p className="mt-2 text-[11px] text-destructive">{o.failure_reason}</p>
                      )}

                      {o.status === "awaiting_activation" ? (
                        <div className="mt-3 rounded-xl border border-warning/40 bg-warning/10 p-3">
                          <p className="text-[11px] font-semibold text-warning">
                            Your order is approved and ready. Pay KES {o.activation_amount ?? o.amount} to activate it now.
                          </p>
                          <button
                            onClick={() => retry(o)}
                            disabled={retryingId === o.id}
                            className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg gradient-primary py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-60"
                          >
                            {retryingId === o.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="h-3.5 w-3.5" />
                            )}
                            Activate for KES {o.activation_amount ?? o.amount}
                          </button>
                        </div>
                      ) : (
                        o.status !== "completed" && (
                          <button
                            onClick={() => retry(o)}
                            disabled={retryingId === o.id}
                            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-primary/40 py-2 text-xs font-bold text-primary disabled:opacity-60"
                          >
                            {retryingId === o.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Repeat className="h-3.5 w-3.5" />
                            )}
                            {o.category === "loans" ? "Complete activation" : "Try again"}
                          </button>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Account;
