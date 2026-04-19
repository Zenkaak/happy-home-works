import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, RotateCw } from "lucide-react";
import { format } from "date-fns";

const AdminWithdrawals = () => {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-withdrawals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawals")
        .select("*, vendors(name, phone, mpesa_payout)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, refund }: { id: string; status: string; refund?: { vendor_id: string; amount: number } }) => {
      const updates: any = { status };
      if (status === "completed") updates.completed_at = new Date().toISOString();
      if (status === "failed") updates.failure_reason = "Manually marked failed by admin";

      const { error } = await supabase.from("withdrawals").update(updates).eq("id", id);
      if (error) throw error;

      if (refund) {
        const { data: v } = await supabase.from("vendors").select("commission_balance").eq("id", refund.vendor_id).single();
        await supabase.from("vendors")
          .update({ commission_balance: Number(v?.commission_balance || 0) + refund.amount })
          .eq("id", refund.vendor_id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      toast({ title: "Updated" });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      completed: "bg-primary/10 text-primary",
      processing: "bg-warning/10 text-warning",
      pending: "bg-warning/10 text-warning",
      failed: "bg-destructive/10 text-destructive",
    };
    return <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${map[s] || "bg-muted text-muted-foreground"}`}>{s}</span>;
  };

  if (isLoading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const stuck = rows?.filter((r: any) => r.status === "processing" || r.status === "pending") || [];

  return (
    <div className="space-y-3">
      {stuck.length > 0 && (
        <div className="rounded-lg bg-warning/10 border border-warning/30 p-3 text-xs text-warning font-semibold">
          ⚠️ {stuck.length} withdrawal{stuck.length > 1 ? "s" : ""} stuck in processing. Mark complete (if M-PESA arrived) or refund (if not).
        </div>
      )}

      {rows?.map((w: any) => (
        <div key={w.id} className="bg-card border border-border rounded-xl p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-bold text-sm truncate">{w.vendors?.name || "Unknown"}</p>
              <p className="text-[11px] text-muted-foreground font-mono">{w.phone}</p>
              <p className="text-[10px] text-muted-foreground">{format(new Date(w.created_at), "MMM d, h:mm a")}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-bold text-base">KSH {Number(w.amount).toLocaleString()}</p>
              {statusBadge(w.status)}
            </div>
          </div>

          {w.mpesa_reference && (
            <p className="text-xs font-mono text-primary">Ref: {w.mpesa_reference}</p>
          )}
          {w.failure_reason && (
            <p className="text-xs text-destructive bg-destructive/10 rounded px-2 py-1">⚠️ {w.failure_reason}</p>
          )}

          {(w.status === "processing" || w.status === "pending") && (
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => updateStatus.mutate({ id: w.id, status: "completed" })}
                className="text-[11px] py-1.5 rounded bg-primary/10 text-primary font-semibold flex items-center justify-center gap-1"
              >
                <CheckCircle2 className="w-3 h-3" /> Mark Paid
              </button>
              <button
                onClick={() => {
                  if (confirm(`Refund KSH ${w.amount} back to ${w.vendors?.name}?`)) {
                    updateStatus.mutate({ id: w.id, status: "failed", refund: { vendor_id: w.vendor_id, amount: Number(w.amount) } });
                  }
                }}
                className="text-[11px] py-1.5 rounded bg-warning/10 text-warning font-semibold flex items-center justify-center gap-1"
              >
                <RotateCw className="w-3 h-3" /> Refund
              </button>
              <button
                onClick={() => updateStatus.mutate({ id: w.id, status: "failed" })}
                className="text-[11px] py-1.5 rounded bg-destructive/10 text-destructive font-semibold flex items-center justify-center gap-1"
              >
                <XCircle className="w-3 h-3" /> Mark Failed
              </button>
            </div>
          )}
        </div>
      ))}

      {rows?.length === 0 && (
        <p className="text-center text-muted-foreground text-sm py-10">No withdrawals yet</p>
      )}
    </div>
  );
};

export default AdminWithdrawals;
