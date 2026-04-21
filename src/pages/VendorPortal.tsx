import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { isValidKenyanPhone } from "@/lib/formatPhone";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import VendorDashboard from "@/components/VendorDashboard";
import { Loader2, UserPlus, LogIn, ArrowLeft, TrendingUp, Wallet, BarChart3, CheckCircle2, ShieldAlert } from "lucide-react";

type View = "menu" | "apply" | "signin" | "dashboard" | "banned";

const VendorPortal = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [view, setView] = useState<View>("menu");
  const [loading, setLoading] = useState(false);

  // Apply form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [mpesaPayout, setMpesaPayout] = useState("");

  // Sign in form
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Dashboard state
  const [vendorSession, setVendorSession] = useState<{ vendor_id: string; name: string; referral_code: string } | null>(null);

  // Banned state
  const [bannedInfo, setBannedInfo] = useState<{ name?: string; phone: string } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("vendor_session");
    if (saved) {
      try {
        const session = JSON.parse(saved);
        setVendorSession(session);
        setView("dashboard");
      } catch {}
    }
  }, []);

  const handleApply = async () => {
    if (!name.trim()) return toast({ title: "Name required", variant: "destructive" });
    if (!isValidKenyanPhone(phone)) return toast({ title: "Invalid phone number", variant: "destructive" });
    if (password.length < 4) return toast({ title: "Password must be at least 4 characters", variant: "destructive" });
    if (!isValidKenyanPhone(mpesaPayout)) return toast({ title: "Invalid M-Pesa payout number", variant: "destructive" });

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("vendor-api", {
        body: { action: "register", name: name.trim(), phone, password, mpesa_payout: mpesaPayout },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Auto sign-in straight to dashboard
      const session = { vendor_id: data.vendor_id, name: data.name, referral_code: data.referral_code };
      localStorage.setItem("vendor_session", JSON.stringify(session));
      setVendorSession(session);
      setView("dashboard");
      toast({ title: `Welcome, ${data.name}!`, description: "Your vendor account is active." });
    } catch (err: any) {
      toast({ title: "Application failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!isValidKenyanPhone(loginPhone)) return toast({ title: "Invalid phone", variant: "destructive" });
    if (!loginPassword) return toast({ title: "Password required", variant: "destructive" });

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("vendor-api", {
        body: { action: "login", phone: loginPhone, password: loginPassword },
      });

      // Banned vendors come back as { banned: true, error, vendor_name } with status 403.
      // supabase.functions.invoke surfaces the body in `data` even on non-2xx in many cases.
      const banned = (data as any)?.banned || /suspended|banned/i.test((error as any)?.message || "");
      if (banned) {
        setBannedInfo({ name: (data as any)?.vendor_name, phone: loginPhone });
        setView("banned");
        return;
      }

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const session = { vendor_id: data.vendor_id, name: data.name, referral_code: data.referral_code };
      localStorage.setItem("vendor_session", JSON.stringify(session));
      setVendorSession(session);
      setView("dashboard");
      toast({ title: `Welcome back, ${data.name}!` });
    } catch (err: any) {
      toast({ title: "Sign in failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("vendor_session");
    setVendorSession(null);
    setView("menu");
  };

  if (view === "dashboard" && vendorSession) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <VendorDashboard session={vendorSession} onLogout={handleLogout} />
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="px-4 py-6 max-w-md mx-auto space-y-4">
        {view === "menu" && (
          <>
            <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-card px-5 py-6 text-center space-y-3 shadow-xl shadow-primary/5">
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/15 to-transparent" />
              <div className="relative inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
                Vendor Program
              </div>
              <div className="relative space-y-2">
                <h1 className="font-display text-2xl font-bold text-foreground">Grow with DASNET</h1>
                <p className="text-sm text-muted-foreground">Launch instantly, share your referral link, and earn 10% commission on every completed sale.</p>
              </div>
            </div>

            <button
              onClick={() => setView("apply")}
              className="w-full flex items-center gap-3 p-4 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground">Apply as Vendor</p>
                 <p className="text-xs text-muted-foreground">Create your account and enter your dashboard instantly</p>
              </div>
            </button>

            <button
              onClick={() => setView("signin")}
              className="w-full flex items-center gap-3 p-4 rounded-xl bg-secondary border border-border hover:bg-muted transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <LogIn className="w-5 h-5 text-foreground" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground">Sign In</p>
                <p className="text-xs text-muted-foreground">Access your vendor dashboard</p>
              </div>
            </button>

            <button onClick={() => navigate("/")} className="w-full text-center text-sm text-muted-foreground hover:text-foreground py-2">
              ← Back to Store
            </button>
          </>
        )}

        {view === "apply" && (
          <>
            <button
              onClick={() => setView("menu")}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-card">
              {/* Header band */}
              <div className="relative px-5 pt-6 pb-5 border-b border-border/60">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-transparent" />
                <div className="relative space-y-2.5">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    Vendor Application
                  </div>
                  <h2 className="font-display text-[22px] font-extrabold text-foreground leading-tight">
                    Start earning today
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Submit your details once. Get instant access to your dashboard, live referral link and weekly payouts.
                  </p>
                </div>
              </div>

              {/* Stats strip */}
              <div className="grid grid-cols-3 divide-x divide-border/60 border-b border-border/60">
                <div className="px-3 py-3.5 text-center">
                  <TrendingUp className="w-4 h-4 text-primary mx-auto mb-1" />
                  <p className="font-display text-base font-extrabold text-foreground leading-none">10%</p>
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground mt-1 font-semibold">Commission</p>
                </div>
                <div className="px-3 py-3.5 text-center">
                  <Wallet className="w-4 h-4 text-primary mx-auto mb-1" />
                  <p className="font-display text-base font-extrabold text-foreground leading-none">M-Pesa</p>
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground mt-1 font-semibold">Payouts</p>
                </div>
                <div className="px-3 py-3.5 text-center">
                  <BarChart3 className="w-4 h-4 text-primary mx-auto mb-1" />
                  <p className="font-display text-base font-extrabold text-foreground leading-none">Live</p>
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground mt-1 font-semibold">Tracking</p>
                </div>
              </div>

              {/* Form */}
              <div className="p-5 space-y-4">
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-foreground/80 mb-1.5 uppercase tracking-wider">
                      Full name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full px-4 py-3 rounded-xl bg-secondary/60 border border-border/60 text-sm font-medium placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/40 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-foreground/80 mb-1.5 uppercase tracking-wider">
                      Phone number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="07XX XXX XXX"
                      className="w-full px-4 py-3 rounded-xl bg-secondary/60 border border-border/60 text-sm font-medium placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/40 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-foreground/80 mb-1.5 uppercase tracking-wider">
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a secure password"
                      className="w-full px-4 py-3 rounded-xl bg-secondary/60 border border-border/60 text-sm font-medium placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/40 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-foreground/80 mb-1.5 uppercase tracking-wider">
                      M-Pesa payout number
                    </label>
                    <input
                      type="tel"
                      value={mpesaPayout}
                      onChange={(e) => setMpesaPayout(e.target.value)}
                      placeholder="07XX XXX XXX"
                      className="w-full px-4 py-3 rounded-xl bg-secondary/60 border border-border/60 text-sm font-medium placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/40 transition-all"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
                      Where your weekly commission earnings will be sent.
                    </p>
                  </div>
                </div>

                {/* Trust list */}
                <ul className="space-y-1.5 pt-1">
                  {[
                    "Instant dashboard activation",
                    "Personal referral link & QR code",
                    "Weekly automatic M-Pesa payouts",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={handleApply}
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl gradient-primary font-bold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>Create vendor account</>
                  )}
                </button>

                <p className="text-[10px] text-center text-muted-foreground leading-relaxed">
                  By applying you agree to DASNET's vendor terms.
                </p>
              </div>
            </section>
          </>
        )}

        {view === "signin" && (
          <>
            <button
              onClick={() => setView("menu")}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            <section className="rounded-2xl border border-border/60 bg-card overflow-hidden">
              <div className="px-5 pt-5 pb-4 border-b border-border/60">
                <h2 className="font-display text-xl font-extrabold text-foreground">Vendor Sign In</h2>
                <p className="text-xs text-muted-foreground mt-1">Welcome back. Access your dashboard.</p>
              </div>
              <div className="p-5 space-y-4">
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-foreground/80 mb-1.5 uppercase tracking-wider">
                      Phone number
                    </label>
                    <input
                      type="tel"
                      value={loginPhone}
                      onChange={(e) => setLoginPhone(e.target.value)}
                      placeholder="07XX XXX XXX"
                      className="w-full px-4 py-3 rounded-xl bg-secondary/60 border border-border/60 text-sm font-medium placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/40 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-foreground/80 mb-1.5 uppercase tracking-wider">
                      Password
                    </label>
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full px-4 py-3 rounded-xl bg-secondary/60 border border-border/60 text-sm font-medium placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/40 transition-all"
                    />
                  </div>
                </div>
                <button
                  onClick={handleSignIn}
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl gradient-primary font-bold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Signing in...
                    </>
                  ) : (
                    <>Sign in</>
                  )}
                </button>
              </div>
            </section>
          </>
        )}

        {view === "banned" && bannedInfo && (
          <>
            <button
              onClick={() => { setView("menu"); setBannedInfo(null); }}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            <section className="rounded-2xl border border-destructive/40 bg-card overflow-hidden">
              <div className="bg-destructive/90 px-6 py-7 text-center">
                <ShieldAlert className="w-14 h-14 text-destructive-foreground mx-auto mb-3" />
                <h2 className="font-display text-2xl font-extrabold text-destructive-foreground">
                  Account Suspended
                </h2>
                <span className="inline-block mt-2 px-3 py-1 rounded-full bg-destructive-foreground/20 text-destructive-foreground text-[11px] font-bold tracking-wider">
                  VENDOR BANNED
                </span>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-sm text-foreground text-center">
                  {bannedInfo.name ? <>Hi <span className="font-bold">{bannedInfo.name}</span>, your</> : <>Your</>} vendor
                  account linked to <span className="font-bold">{bannedInfo.phone}</span> has been suspended by the admin team.
                </p>
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-xs text-destructive">
                  You cannot access the dashboard or earn commissions while suspended. If you believe this is a mistake, request a review and our team will respond shortly.
                </div>
                <div className="space-y-2">
                  <a
                    href={`https://wa.me/254112628799?text=${encodeURIComponent(
                      `Hello DASNET, my vendor account (${bannedInfo.phone}${bannedInfo.name ? ` – ${bannedInfo.name}` : ""}) has been suspended. Please review my account.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 rounded-xl gradient-primary text-primary-foreground font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 shadow-lg shadow-primary/20"
                  >
                    <ShieldAlert className="w-4 h-4" />
                    Request Account Review
                  </a>
                  <button
                    onClick={() => { setView("menu"); setBannedInfo(null); }}
                    className="w-full py-2.5 rounded-xl border border-border font-medium text-sm"
                  >
                    Close
                  </button>
                </div>
                <p className="text-center text-[11px] text-muted-foreground">
                  Support: WhatsApp +254 112 628 799
                </p>
              </div>
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default VendorPortal;
