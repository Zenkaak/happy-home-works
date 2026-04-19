import { useState } from "react";
import { Loader2, Edit2, Check, X, Shield, ShieldOff, Trash2, Ban, Info } from "lucide-react";

const AdminVendorManager = ({ vendors, onUpdateVendor, onDeleteVendor, onBanVendor }: any) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [newBalance, setNewBalance] = useState("");

  if (!vendors) return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <h2 className="font-bold text-sm">Vendor Management</h2>
      <div className="grid gap-3">
        {vendors.map((vendor: any) => (
          <div key={vendor.id} className={`bg-card border rounded-xl p-4 space-y-3 ${vendor.is_banned ? 'opacity-50 border-destructive' : 'border-border'}`}>
            <div className="flex items-center justify-between">
              <div onClick={() => setSelectedVendor(vendor)} className="cursor-pointer flex items-center gap-2">
                <p className="text-sm font-bold">{vendor.name} {vendor.is_banned && "🚫"}</p>
                <Info className="w-3 h-3 text-muted-foreground" />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onUpdateVendor({ id: vendor.id, is_active: !vendor.is_active })}
                  className={`px-2 py-1 rounded text-[10px] font-bold ${vendor.is_active ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}
                >
                  {vendor.is_active ? "ACTIVE" : "DISABLED"}
                </button>
              </div>
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

            <div className="flex justify-end gap-3 pt-2 border-t border-border/50">
              <button onClick={() => onBanVendor(vendor)} className="text-destructive flex items-center gap-1 text-[10px] font-bold uppercase">
                <Ban className="w-3 h-3" /> Ban
              </button>
              <button onClick={() => onDeleteVendor(vendor.id)} className="text-muted-foreground hover:text-destructive flex items-center gap-1 text-[10px] font-bold uppercase">
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Basic Detail Modal */}
      {selectedVendor && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-sm rounded-2xl p-6 relative">
            <button onClick={() => setSelectedVendor(null)} className="absolute top-4 right-4"><X /></button>
            <h3 className="font-bold text-lg mb-4">Vendor Details</h3>
            <div className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Name:</span> {selectedVendor.name}</p>
              <p><span className="text-muted-foreground">Phone:</span> {selectedVendor.phone_number}</p>
              <p><span className="text-muted-foreground">Code:</span> {selectedVendor.referral_code}</p>
              <p><span className="text-muted-foreground">Joined:</span> {new Date(selectedVendor.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminVendorManager;
