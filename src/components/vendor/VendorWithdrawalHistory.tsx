import { format } from "date-fns";
import { CheckCircle2, Clock3, RotateCcw, Wallet } from "lucide-react";

interface WithdrawalRecord {
  id: string;
  amount: number;
  status: string;
  mpesa_reference: string | null;
  created_at: string;
}

const statusMeta: Record<string, { label: string; icon: typeof Clock3; className: string }> = {
  completed: {
    label: "Paid out",
    icon: CheckCircle2,
    className: "bg-primary/10 text-primary border-primary/20",
  },
  failed: {
    label: "Failed • funds returned to wallet",
    icon: RotateCcw,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  pending: {
    label: "Processing",
    icon: Clock3,
    className: "bg-warning/10 text-warning border-warning/20",
  },
  processing: {
    label: "Processing",
    icon: Clock3,
    className: "bg-warning/10 text-warning border-warning/20",
  },
};

const VendorWithdrawalHistory = ({ withdrawals }: { withdrawals: WithdrawalRecord[] }) => {
  const orderedWithdrawals = [...withdrawals].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  if (!orderedWithdrawals.length) {
    return (
      <div className="text-center py-10 text-muted-foreground text-sm border-2 border-dashed rounded-xl bg-muted/20">
        <p>No withdrawals yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {orderedWithdrawals.map((withdrawal) => {
        const meta = statusMeta[withdrawal.status] || statusMeta.pending;
        const Icon = meta.icon;

        return (
          <div key={withdrawal.id} className="bg-card border border-border rounded-xl p-3 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold">KSH {Number(withdrawal.amount || 0).toLocaleString()}</p>
                <p className="text-[11px] text-muted-foreground">
                  {format(new Date(withdrawal.created_at), "MMM d, h:mm a")}
                </p>
              </div>

              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${meta.className}`}>
                <Icon className="w-3 h-3" />
                {withdrawal.status === "failed" ? "Failed" : meta.label}
              </span>
            </div>

            <div className="rounded-xl bg-secondary/40 border border-border/50 px-3 py-2.5 text-xs text-muted-foreground">
              {withdrawal.status === "failed" ? (
                <p>Failed, funds returned to wallet.</p>
              ) : withdrawal.status === "completed" && withdrawal.mpesa_reference ? (
                <p className="flex items-center gap-1.5 text-foreground">
                  <Wallet className="w-3.5 h-3.5 text-primary" />
                  Ref: <span className="font-mono font-semibold">{withdrawal.mpesa_reference}</span>
                </p>
              ) : (
                <p>Your payout is being processed.</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default VendorWithdrawalHistory;