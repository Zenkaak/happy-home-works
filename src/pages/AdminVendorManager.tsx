import { useState } from "react";
import { Loader2, UserCheck, UserX, Edit2 } from "lucide-react";

const AdminVendorManager = ({ vendors, onUpdateVendor }: { vendors: any[]; onUpdateVendor: (v: any) => void }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newBalance, setNewBalance] = useState("");

  if (!vendors) return <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-sm mb-4">Manage Vendors</h2>
      {vendors.length === 0 ? (
        <p className="text-sm text-muted-foreground">No vendors found.</p>
      ) : (
        vendors.map((vendor) => (
          <div key={vendor.id} className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">{vendor.name}</p>
                <p className="text-[10px] text-muted-foreground">Code: {vendor.referral_code}</p>
              </div>
              <button
                onClick={() => onUpdateVendor({ id: vendor.id, is_active: !vendor.is_active })}
                className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase ${
                  vendor.is_active ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                }`}
              >
                {vendor.is_active ? "Active" : "Disabled"}
              </button>
            </div>

            <div className="flex items-center justify-between bg-secondary/50 p-2 rounded-lg">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Commission Balance</p>
                <p className="text-sm font-mono font-bold">KSH {vendor.commission_balance || 0}</p>
              </div>
              {editingId === vendor.id ? (
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={newBalance}
                    onChange={(e) => setNewBalance(e.target.value)}
                    className="w-20 px-2 py-1 text-xs bg-background border border-border rounded"
                    placeholder="New bal"
                  />
                  <button 
                    onClick={() => {
                      onUpdateVendor({ id: vendor.id, commission_balance: parseFloat(newBalance) });
                      setEditingId(null);
                    }}
                    className="text-[10px] bg-primary text-primary-foreground px-2 py-1 rounded"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <button onClick={() => { setEditingId(vendor.id); setNewBalance(vendor.commission_balance); }} className="p-1.5 hover:bg-border rounded-md">
                  <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default AdminVendorManager;

