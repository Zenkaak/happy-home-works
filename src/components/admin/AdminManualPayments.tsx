import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";

const AdminManualPayments = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-manual-payments", filter],
    queryFn: async () => {
      let q = supabase.from("manual_payments").select("*").order("created_at", { ascending: false }).limit(100);
      if (filter === "pending") q = q.eq("status", "pending");
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    refetchInterval: 8000,
  });

  const act = useMutation({
    mutationFn: async ({ id, action, notes }: { id: string; action: "verify" | "reject"; notes?: string }) => {
      const token = localStorage.getItem("dasnet_admin_token");
      const { data, error } = await supabase.functions.invoke("manual-payment", {
        body: { action, id, admin_notes: notes },
        headers: { "x-admin-token": token || "" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-manual-payments"] });
      qc.invalidateQueries({ queryKey: ["admin-transactions"] });
      toast({ title: "Done" });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button onClick={() => setFilter("pending")} className={`text-xs px-3 py-1.5 rounded-lg font-semibold ${filter === "pending" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>Pending</button>
        <button onClick={() => setFilter("all")} className={`text-xs px-3 py-1.5 rounded-lg font-semibold ${filter === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>All</button>
      </div>

      {rows?.map((mp: any) => {
        const badge = mp.status === "verified" ? "bg-primary/10 text-primary" :
                     mp.status === "rejected" ? "bg-destructive/10 text-destructive" :
                     "bg-warning/10 text-warning";
        return (
          <div key={mp.id} className="bg-card border border-border rounded-xl p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-sm">{mp.package_name || "—"}</p>
                <p className="text-[11px] text-muted-foreground font-mono">{mp.phone_number}</p>
                <p className="text-[10px] text-muted-foreground">{format(new Date(mp.created_at), "MMM d, h:mm a")}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold">KSH {mp.amount.toLocaleString()}</p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${badge}`}>{mp.status}</span>
              </div>
            </div>

            <div className="bg-secondary rounded-lg px-3 py-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">M-PESA Code</p>
              <p className="font-mono font-bold text-sm tracking-wider">{mp.mpesa_code}</p>
            </div>

            {mp.admin_notes && (
              <p className="text-xs text-muted-foreground italic">Note: {mp.admin_notes}</p>
            )}

            {mp.status === "pending" && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => act.mutate({ id: mp.id, action: "verify" })}
                  className="text-xs py-2 rounded-lg bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verify & Deliver
                </button>
                <button
                  onClick={() => {
                    const reason = prompt("Reason for rejection?");
                    if (reason) act.mutate({ id: mp.id, action: "reject", notes: reason });
                  }}
                  className="text-xs py-2 rounded-lg bg-destructive/10 text-destructive font-semibold flex items-center justify-center gap-1"
                >
                  <XCircle className="w-3.5 h-3.5" /> Reject
                </button>
              </div>
            )}
          </div>
        );
      })}

      {rows?.length === 0 && (
        <p className="text-center text-muted-foreground text-sm py-10">No manual payments</p>
      )}
    </div>
  );
};

export default AdminManualPayments;
