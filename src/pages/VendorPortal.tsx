import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { isValidKenyanPhone } from "@/lib/formatPhone";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import VendorDashboard from "@/components/VendorDashboard";
import { Loader2, UserPlus, LogIn, ArrowLeft } from "lucide-react";

type View = "menu" | "apply" | "signin" | "dashboard";

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
            <button onClick={() => setView("menu")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-5 shadow-2xl shadow-primary/5">
              <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-primary/10 to-transparent" />
              <div className="relative space-y-5">
                <div className="space-y-2">
                  <div className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
                    Professional Vendor Setup
                  </div>
                  <h2 className="font-display text-2xl font-bold">Open your vendor dashboard in minutes</h2>
                  <p className="text-sm text-muted-foreground">Submit your details once and go straight to your dashboard with your live sales link, earnings, and withdrawal tools.</p>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-2xl border border-border bg-secondary/40 px-3 py-3">
                    <p className="text-lg font-black text-foreground">10%</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Commission</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-secondary/40 px-3 py-3">
                    <p className="text-lg font-black text-foreground">Live</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Referral Link</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-secondary/40 px-3 py-3">
                    <p className="text-lg font-black text-foreground">24/7</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Tracking</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1 uppercase tracking-wider">Full Name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="John Doe"
                      className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1 uppercase tracking-wider">Phone Number</label>
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="07XXXXXXXX"
                      className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1 uppercase tracking-wider">Password</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Create a password"
                      className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1 uppercase tracking-wider">M-Pesa Payout Number</label>
                    <input type="tel" value={mpesaPayout} onChange={e => setMpesaPayout(e.target.value)} placeholder="07XXXXXXXX"
                      className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                </div>

                <button onClick={handleApply} disabled={loading}
                  className="w-full py-4 rounded-xl gradient-primary font-bold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {loading ? "Submitting..." : "Submit Application"}
                </button>
              </div>
            </section>
          </>
        )}

        {view === "signin" && (
          <>
            <button onClick={() => setView("menu")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <h2 className="font-display text-xl font-bold">Vendor Sign In</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1 uppercase tracking-wider">Phone Number</label>
                <input type="tel" value={loginPhone} onChange={e => setLoginPhone(e.target.value)} placeholder="07XXXXXXXX"
                  className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1 uppercase tracking-wider">Password</label>
                <input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="Enter your password"
                  className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <button onClick={handleSignIn} disabled={loading}
              className="w-full py-4 rounded-xl gradient-primary font-bold text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default VendorPortal;
