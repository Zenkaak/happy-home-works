import { TrendingUp, ShoppingBag, CheckCircle2, XCircle, Trash2, MessageSquare, Eye } from "lucide-react";
import { format } from "date-fns";
import type { Transaction } from "@/lib/types";

interface AdminOverviewProps {
  transactions: Transaction[] | undefined;
  onViewTx: (tx: Transaction) => void;
  onSendSms: (tx: Transaction) => void;
  onDeleteTx: (id: string) => void;
}

const AdminOverview = ({ transactions, onViewTx, onSendSms, onDeleteTx }: AdminOverviewProps) => {
  const completed = transactions?.filter((t) => t.status === "completed") || [];
  const totalRevenue = completed.reduce((s, t) => s + t.amount, 0);
  const totalOrders = transactions?.length || 0;
  const successCount = completed.length;
  const failedCount = transactions?.filter((t) => t.status === "failed").length || 0;
  const successRate = totalOrders ? Math.round((successCount / totalOrders) * 100) : 0;

  const kpis = [
    { label: "Revenue", value: `KES ${totalRevenue.toLocaleString()}`, icon: TrendingUp, accent: "text-primary", bg: "bg-primary/10", border: "border-primary/20" },
    { label: "Orders", value: totalOrders.toString(), icon: ShoppingBag, accent: "text-foreground", bg: "bg-secondary", border: "border-border" },
    { label: "Success", value: `${successCount}`, sub: `${successRate}% rate`, icon: CheckCircle2, accent: "text-primary", bg: "bg-primary/10", border: "border-primary/20" },
    { label: "Failed", value: failedCount.toString(), icon: XCircle, accent: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/20" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="gradient-card rounded-xl p-4 hover:border-primary/30 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{k.label}</p>
                <div className={`w-7 h-7 rounded-lg ${k.bg} ${k.border} border flex items-center justify-center`}>
                  <Icon className={`w-3.5 h-3.5 ${k.accent}`} />
                </div>
              </div>
              <p className={`text-xl font-display font-extrabold ${k.accent} leading-tight`}>{k.value}</p>
              {k.sub && <p className="text-[10px] text-muted-foreground mt-0.5">{k.sub}</p>}
            </div>
          );
        })}
      </div>

      <div className="gradient-card rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-bold text-sm">Recent Transactions</h3>
          <span className="text-[10px] text-muted-foreground">Last {Math.min(15, transactions?.length || 0)}</span>
        </div>
        <div className="space-y-1">
          {transactions?.slice(0, 15).map((tx) => (
            <div key={tx.id} className="flex items-center justify-between gap-2 py-2 px-2 -mx-2 rounded-lg border-b border-border/30 last:border-0 hover:bg-secondary/40 transition-colors">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{tx.package_name}</p>
                <p className="text-[11px] text-muted-foreground">{tx.phone_number} • {format(new Date(tx.created_at), "MMM d, HH:mm")}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-display font-bold ${tx.status === "completed" ? "text-primary" : tx.status === "failed" ? "text-destructive" : "text-warning"}`}>
                  KES {tx.amount}
                </span>
                <button onClick={() => onViewTx(tx)} className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="View">
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => onSendSms(tx)} className="p-1.5 rounded-md hover:bg-primary/10 text-primary transition-colors" title="SMS">
                  <MessageSquare className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => { if (confirm("Delete?")) onDeleteTx(tx.id); }} className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive transition-colors" title="Delete">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          {(!transactions || transactions.length === 0) && (
            <p className="text-center text-xs text-muted-foreground py-6">No transactions yet</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
