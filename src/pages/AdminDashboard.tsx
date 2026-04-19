import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Transaction, Product } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
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

  const tabs: { key: TabKey; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "charts", label: "Analytics" },
    { key: "products", label: "Products" },
    { key: "transactions", label: "Orders" },
    { key: "vendors", label: "Vendors" },
    { key: "withdrawals", label: "Withdrawals" },
    { key: "paybill", label: "Paybill" },
    { key: "manual_pay", label: "Manual Pay" },
    { key: "chat", label: "Chat" },
    { key: "announcements", label: "Announce" },
    { key: "sms_logs", label: "SMS" },
    { key: "broadcast", label: "Broadcast" },
    { key: "stk", label: "STK" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 px-4 py-3 bg-card/95 backdrop-blur-md border-b border-border flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center shadow-md shadow-primary/30">
            <span className="text-primary-foreground font-bold text-sm">D</span>
          </div>
          <div>
            <h1 className="font-display font-bold text-base leading-tight">DASNET Console</h1>
            <p className="text-[10px] text-muted-foreground tracking-wider uppercase">Admin Operations</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Live</span>
          </span>
          <button onClick={handleLogout} className="px-3 py-1.5 border border-border rounded-lg hover:text-destructive hover:border-destructive text-xs font-semibold transition-all">
            Logout
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="px-3 py-2 flex gap-1.5 overflow-x-auto no-scrollbar border-b border-border bg-card/50 backdrop-blur-sm">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              tab === t.key
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <main className="p-4">
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
 
