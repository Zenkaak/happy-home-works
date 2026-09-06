import { useState } from "react";
import { Loader2, Edit2, Check, X, Trash2, Ban, Info, Copy } from "lucide-react";
import { getAppBaseUrl } from "@/lib/siteUrl";
import { toast } from "sonner";

const AdminVendorManager = ({ vendors, onUpdateVendor, onDeleteVendor, onBanVendor }: any) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [newBalance, setNewBalance] = useState("");

  if (!vendors) return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>;

  const refLink = (v: any) => `${getAppBaseUrl()}/?ref=${v?.referral_code}`;

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const Row = ({ label, value }: { label: string; value: any }) => (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-border/50 last:border-0">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs font-medium text-right break-all">{value ?? "—"}</span>
    </div>
  );

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-sm">Vendor Management</h2>
      <div className="grid gap-3">
        {vendors.map((vendor: any) => (
          <div key={vendor.id} className={`bg-card border rounded-xl p-4 space-y-3 ${vendor.is_banned || vendor.status === "banned" ? 'opacity-60 border-destructive' : 'border-border'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">{vendor.name} {(vendor.is_banned || vendor.status === "banned") && "🚫"}</p>
                <p className="text-[10px] text-muted-foreground">{vendor.phone} · {vendor.referral_code}</p>
              </div>
              <button
                onClick={() => onUpdateVendor({ id: vendor.id, is_active: !vendor.is_active })}
                className={`px-2 py-1 rounded text-[10px] font-bold ${vendor.is_active ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}
              >
                {vendor.is_active ? "ACTIVE" : "DISABLED"}
              </button>
            </div>

            <div className="flex items-center justify-between bg-secondary/30 p-2 rounded-lg">
              <p className="text-sm font-mono font-bold text-primary">KSH {vendor.commission_balance || 0}</p>
              {editingId === vendor.id ? (
                <div className="flex gap-1">
                  <input type="number" value={newBalance} onChange={(e) => setNewBalance(e.target.value)} className="w-16 px-1 text-xs bg-background border rounded" />
                  <button onClick={() => { onUpdateVendor({ id: vendor.id, commission_balance: parseFloat(newBalance) }); setEditingId(null); }} className="bg-primary p-1 rounded"><Check className="w-3 h-3" /></button>
                </div>
              ) : (
                <button onClick={() => { setEditingId(vendor.id); setNewBalance(vendor.commission_balance); }} className="text-[10px] flex items-center gap-1 text-muted-foreground hover:text-foreground">
                  <Edit2 className="w-3 h-3" /> Edit Bal
                </button>
              )}
            </div>

            <div className="flex justify-between items-center gap-3 pt-2 border-t border-border/50">
              <button onClick={() => setSelectedVendor(vendor)} className="text-primary flex items-center gap-1 text-[10px] font-bold uppercase">
                <Info className="w-3 h-3" /> View Details
              </button>
              <div className="flex gap-3">
                <button onClick={() => onBanVendor(vendor)} className="text-destructive flex items-center gap-1 text-[10px] font-bold uppercase">
                  <Ban className="w-3 h-3" /> Ban
                </button>
                <button onClick={() => onDeleteVendor(vendor.id)} className="text-muted-foreground hover:text-destructive flex items-center gap-1 text-[10px] font-bold uppercase">
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedVendor && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-sm rounded-2xl p-6 relative max-h-[85vh] overflow-y-auto">
            <button onClick={() => setSelectedVendor(null)} className="absolute top-4 right-4"><X className="w-4 h-4" /></button>
            <h3 className="font-bold text-lg mb-4">Vendor Details</h3>
            <div className="space-y-0.5">
              <Row label="Name" value={selectedVendor.name} />
              <Row label="Phone" value={selectedVendor.phone} />
              <Row label="Payout No." value={selectedVendor.mpesa_payout} />
              <Row label="Status" value={selectedVendor.status} />
              <Row label="Referral Code" value={selectedVendor.referral_code} />
              <Row label="Commission Rate" value={`${Math.round(Number(selectedVendor.commission_rate || 0) * 100)}%`} />
              <Row label="Balance" value={`KSH ${Number(selectedVendor.commission_balance || 0).toLocaleString()}`} />
              <Row label="Total Sales" value={selectedVendor.total_sales ?? 0} />
              <Row label="Total Revenue" value={`KSH ${Number(selectedVendor.total_revenue || 0).toLocaleString()}`} />
              <Row label="Approved" value={selectedVendor.approved_at ? new Date(selectedVendor.approved_at).toLocaleString() : "—"} />
              <Row label="Joined" value={selectedVendor.created_at ? new Date(selectedVendor.created_at).toLocaleString() : "—"} />
            </div>

            <div className="mt-4">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Referral Link</p>
              <div className="flex gap-2">
                <input readOnly value={refLink(selectedVendor)} className="flex-1 text-[11px] bg-background border border-border rounded-lg px-2 py-2 truncate" />
                <button onClick={() => copy(refLink(selectedVendor), "Referral link")} className="bg-primary text-primary-foreground px-3 rounded-lg flex items-center">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminVendorManager;
