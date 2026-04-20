import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Transaction, Product } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import {
  LayoutDashboard, BarChart3, ShoppingBag, Package,
  Wallet, Banknote, Receipt, Smartphone,
  Users, MessageCircle, Megaphone, MessageSquare, Send,
  LogOut, ChevronDown,
} from "lucide-react";
import AdminStkPrompt from "@/components/AdminStkPrompt";
import TransactionDetailModal from "@/components/TransactionDetailModal";
import AdminOverview from "@/components/admin/AdminOverview";
import AdminProductManager from "@/components/admin/AdminProductManager";
import AdminTransactions from "@/components/admin/AdminTransactions";
import AdminRevenueCharts from "@/components/admin/AdminRevenueCharts";
import AdminSmsLogs from "@/components/admin/AdminSmsLogs";
import AdminBulkSms from "@/components/admin/AdminBulkSms";
import AdminAnnouncements from "@/components/admin/AdminAnnouncements";
import AdminChat from "@/components/admin/AdminChat";
import AdminVendorManager from "@/components/admin/AdminVendorManager";
import AdminWithdrawals from "@/components/admin/AdminWithdrawals";
import AdminManualPayments from "@/components/admin/AdminManualPayments";
import AdminPaybillTools from "@/components/admin/AdminPaybillTools";

const getAdminToken = () => localStorage.getItem("dasnet_admin_token");

const adminApi = async (action: string, params: Record<string, any> = {}) => {
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

type TabKey = "overview" | "charts" | "products" | "transactions" | "vendors" | "withdrawals" | "manual_pay" | "sms_logs" | "broadcast" | "stk" | "announcements" | "chat" | "paybill";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabKey>("overview");
  const [smsTarget, setSmsTarget] = useState<Transaction | null>(null);
  const [smsMessage, setSmsMessage] = useState("");
  const [viewTx, setViewTx] = useState<Transaction | null>(null);

  useEffect(() => {
    if (!getAdminToken()) navigate("/admin");
  }, [navigate]);

  const { data: transactions } = useQuery({
    queryKey: ["admin-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as Transaction[];
    },
    refetchInterval: 15000,
  });

  const { data: products } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("category")
        .order("sort_order");
      if (error) throw error;
      return data as Product[];
    },
  });

  const { data: vendors } = useQuery({
    queryKey: ["admin-vendors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleError = (err: any) => {
    if (err.message?.includes("expired") || err.message?.includes("Unauthorized")) {
      localStorage.removeItem("dasnet_admin_token");
      navigate("/admin");
    }
    toast({ title: "Error", description: err.message, variant: "destructive" });
  };

  const updateProduct = useMutation({
    mutationFn: async (p: Partial<Product> & { id: string }) => await adminApi("update_product", p),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-products"] }); toast({ title: "Updated" }); },
    onError: handleError,
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => await adminApi("delete_product", { id }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-products"] }); toast({ title: "Deleted" }); },
    onError: handleError,
  });

  const createProduct = useMutation({
    mutationFn: async (p: any) => await adminApi("create_product", p),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-products"] }); toast({ title: "Created" }); },
    onError: handleError,
  });

  const updateVendor = useMutation({
    mutationFn: async (v: { id: string; [key: string]: any }) => await adminApi("update_vendor", v),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-vendors"] }); toast({ title: "Vendor updated" }); },
    onError: handleError,
  });

  const deleteVendor = useMutation({
    mutationFn: async (id: string) => await adminApi("delete_vendor", { id }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-vendors"] }); toast({ title: "Vendor deleted" }); },
    onError: handleError,
  });

  const banVendor = useMutation({
    mutationFn: async (v: { id: string; phone_number: string }) => await adminApi("ban_vendor", v),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-vendors"] }); toast({ title: "Vendor banned" }); },
    onError: handleError,
  });

  const deleteTx = useMutation({
    mutationFn: async (id: string) => await adminApi("delete_transaction", { id }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-transactions"] }); toast({ title: "Transaction removed" }); },
    onError: handleError,
  });

  const updateTxStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => await adminApi("update_transaction_status", { id, status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-transactions"] }); toast({ title: "Status updated" }); },
    onError: handleError,
  });

  const handleResendStk = async (tx: Transaction) => {
    try {
      const { error } = await supabase.functions.invoke("initiate-stk", {
        body: { phone: tx.phone_number, amount: tx.amount, transaction_id: tx.id, account_ref: `DASNET-${tx.order_number}` },
      });
      if (error) throw error;
      toast({ title: "STK resent", description: `Prompt sent to ${tx.phone_number}` });
    } catch (err: any) {
      toast({ title: "Resend failed", description: err.message, variant: "destructive" });
    }
  };

  const handleSendSms = async () => {
    if (!smsTarget || !smsMessage.trim()) return;
    const token = getAdminToken();
    if (!token) return;
    try {
      const { data, error } = await supabase.functions.invoke("send-sms", {
        body: { phone: smsTarget.phone_number, message: smsMessage.trim() },
        headers: { "x-admin-token": token },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "SMS sent", description: `Message sent to ${smsTarget.phone_number}` });
      setSmsTarget(null);
      setSmsMessage("");
    } catch (err: any) {
      toast({ title: "SMS failed", description: err.message, variant: "destructive" });
    }
  };

  const openSmsEditor = (tx: Transaction) => {
    setSmsTarget(tx);
    setSmsMessage(
      tx.status === "completed"
        ? `DASNET: ${tx.package_name} purchase successful. Ref: ${tx.mpesa_reference || "N/A"}.`
        : `DASNET: ${tx.package_name} transaction failed. Use Till 8448104 to complete your purchase.`
    );
  };

  const handleLogout = () => { localStorage.removeItem("dasnet_admin_token"); navigate("/"); };

  const tabGroups: { label: string; items: { key: TabKey; label: string; icon: any }[] }[] = [
    {
      label: "Operations",
      items: [
        { key: "overview", label: "Overview", icon: LayoutDashboard },
        { key: "charts", label: "Analytics", icon: BarChart3 },
        { key: "transactions", label: "Orders", icon: ShoppingBag },
        { key: "products", label: "Products", icon: Package },
      ],
    },
    {
      label: "Money",
      items: [
        { key: "paybill", label: "Paybill", icon: Wallet },
        { key: "withdrawals", label: "Withdrawals", icon: Banknote },
        { key: "manual_pay", label: "Manual Pay", icon: Receipt },
        { key: "stk", label: "STK Push", icon: Smartphone },
      ],
    },
    {
      label: "People & Comms",
      items: [
        { key: "vendors", label: "Vendors", icon: Users },
        { key: "chat", label: "Chat", icon: MessageCircle },
        { key: "announcements", label: "Announcements", icon: Megaphone },
        { key: "sms_logs", label: "SMS Logs", icon: MessageSquare },
        { key: "broadcast", label: "Broadcast", icon: Send },
      ],
    },
  ];

  const allItems = tabGroups.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label })));
  const activeItem = allItems.find((i) => i.key === tab) ?? allItems[0];
  const ActiveIcon = activeItem.icon;
  const activeGroup = tabGroups.find((g) => g.items.some((i) => i.key === tab)) ?? tabGroups[0];

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 border-r border-border bg-card/50 sticky top-0 h-screen">
        <div className="p-4 border-b border-border flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center shadow-md shadow-primary/30">
            <span className="text-primary-foreground font-bold text-sm">D</span>
          </div>
          <div>
            <h1 className="font-display font-bold text-sm leading-tight">DASNET</h1>
            <p className="text-[10px] text-muted-foreground tracking-wider uppercase">Console</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-4">
          {tabGroups.map((group) => (
            <div key={group.label}>
              <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                {group.label}
              </p>
              <div className="space-y-0.5 mt-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = tab === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => setTab(item.key)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                        active
                          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <button
          onClick={handleLogout}
          className="m-2 p-2.5 rounded-lg border border-border hover:border-destructive hover:text-destructive text-xs font-semibold transition-all flex items-center gap-2 justify-center"
        >
          <LogOut className="w-3.5 h-3.5" /> Logout
        </button>
      </aside>

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top header */}
        <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border">
          <div className="lg:hidden px-4 py-2.5 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xs">D</span>
              </div>
              <div>
                <h1 className="font-display font-bold text-sm leading-none">DASNET Console</h1>
                <p className="text-[9px] text-muted-foreground tracking-wider uppercase mt-0.5">Admin</p>
              </div>
            </div>
            <button onClick={handleLogout} className="p-2 rounded-lg border border-border hover:text-destructive hover:border-destructive transition-all">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile dropdown nav */}
          <div className="lg:hidden px-3 pb-2.5 relative">
            <button
              onClick={() => setMobileNavOpen((v) => !v)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-secondary/60 border border-border"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <ActiveIcon className="w-4 h-4" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold leading-none">{activeGroup.label}</p>
                  <p className="text-sm font-bold truncate mt-0.5">{activeItem.label}</p>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${mobileNavOpen ? "rotate-180" : ""}`} />
            </button>

            {mobileNavOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMobileNavOpen(false)} />
                <div className="absolute left-3 right-3 mt-1.5 z-50 bg-card border border-border rounded-xl shadow-2xl max-h-[70vh] overflow-y-auto p-2 space-y-3">
                  {tabGroups.map((group) => (
                    <div key={group.label}>
                      <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                        {group.label}
                      </p>
                      <div className="grid grid-cols-2 gap-1 mt-1">
                        {group.items.map((item) => {
                          const Icon = item.icon;
                          const active = tab === item.key;
                          return (
                            <button
                              key={item.key}
                              onClick={() => { setTab(item.key); setMobileNavOpen(false); }}
                              className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all text-left ${
                                active
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-secondary/40 text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Desktop breadcrumb */}
          <div className="hidden lg:flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{activeGroup.label}</span>
              <span className="text-muted-foreground/50">/</span>
              <span className="font-bold">{activeItem.label}</span>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Live</span>
            </span>
          </div>
        </header>

        {/* Content */}
        <main className="p-4 lg:p-6 flex-1">
        {tab === "overview" && (
          <AdminOverview
            transactions={transactions}
            onViewTx={(tx) => setViewTx(tx)}
            onSendSms={(tx) => openSmsEditor(tx)}
            onDeleteTx={(id) => deleteTx.mutate(id)}
          />
        )}
        {tab === "charts" && <AdminRevenueCharts transactions={transactions} />}
        {tab === "products" && (
          <AdminProductManager
            products={products}
            onUpdateProduct={(p) => updateProduct.mutate(p)}
            onDeleteProduct={(id) => deleteProduct.mutate(id)}
            onCreateProduct={(p) => createProduct.mutate(p)}
          />
        )}
        {tab === "transactions" && (
          <AdminTransactions
            transactions={transactions}
            onViewTx={(tx) => setViewTx(tx)}
            onSendSms={(tx) => openSmsEditor(tx)}
            onDeleteTx={(id) => deleteTx.mutate(id)}
            onUpdateStatus={(id, status) => updateTxStatus.mutate({ id, status })}
          />
        )}
        {tab === "vendors" && (
          <AdminVendorManager
            vendors={vendors}
            onUpdateVendor={(v: any) => updateVendor.mutate(v)}
            onDeleteVendor={(id: string) => {
              if (confirm("Delete this vendor permanently? Their referral history stays but they can't log in.")) {
                deleteVendor.mutate(id);
              }
            }}
            onBanVendor={(v: any) => {
              if (confirm(`Ban ${v.name}? Their account will be disabled and the phone (${v.phone}) will be blocked from re-registering.`)) {
                banVendor.mutate({ id: v.id, phone_number: v.phone });
              }
            }}
          />
        )}
        {tab === "sms_logs" && <AdminSmsLogs />}
        {tab === "broadcast" && <AdminBulkSms />}
        {tab === "announcements" && <AdminAnnouncements />}
        {tab === "chat" && <AdminChat />}
        {tab === "withdrawals" && <AdminWithdrawals />}
        {tab === "paybill" && <AdminPaybillTools />}
        {tab === "manual_pay" && <AdminManualPayments />}
        {tab === "stk" && (
          <div className="space-y-4 max-w-lg">
            <AdminStkPrompt />
          </div>
        )}
        </main>
      </div>

      {/* Transaction Detail Modal */}
      {viewTx && (
        <TransactionDetailModal
          transaction={viewTx}
          onClose={() => setViewTx(null)}
          onDelete={(id) => { deleteTx.mutate(id); setViewTx(null); }}
          onResendStk={handleResendStk}
          showAdminActions
        />
      )}

      {/* SMS Editor Modal */}
      {smsTarget && (
        <div className="fixed inset-0 bg-background/95 backdrop-blur-sm flex items-end sm:items-center justify-center z-[100] p-4">
          <div className="bg-card border border-border w-full max-w-md rounded-xl shadow-2xl">
            <div className="p-4 border-b border-border">
              <p className="font-bold text-sm">Send SMS to {smsTarget.phone_number}</p>
              <p className="text-xs text-muted-foreground">Order #{smsTarget.order_number} • {smsTarget.package_name}</p>
            </div>
            <div className="p-4 space-y-3">
              <textarea
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                rows={4}
                maxLength={320}
                className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm resize-none"
                placeholder="Type SMS message..."
              />
              <p className="text-[10px] text-muted-foreground">{smsMessage.length}/320</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { setSmsTarget(null); setSmsMessage(""); }} className="py-2.5 rounded-lg bg-secondary text-foreground text-sm font-medium">
                  Cancel
                </button>
                <button onClick={handleSendSms} disabled={!smsMessage.trim()} className="py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50">
                  Send SMS
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
 
