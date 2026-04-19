import { TrendingUp, FileText, CheckCircle, XCircle, Eye, Trash2, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import type { Transaction } from "@/lib/types";

interface AdminOverviewProps {
  transactions: Transaction[] | undefined;
  onViewTx: (tx: Transaction) => void;
  onSendSms: (tx: Transaction) => void;
  onDeleteTx: (id: string) => void;
}

const AdminOverview = ({ transactions, onViewTx, onSendSms, onDeleteTx }: AdminOverviewProps) => {
  const totalRevenue = transactions?.filter((t) => t.status === "completed").reduce((s, t) => s + t.amount, 0) || 0;
  const totalOrders = transactions?.length || 0;
  const successCount = transactions?.filter((t) => t.status === "completed").length || 0;
  const failedCount = transactions?.filter((t) => t.status === "failed").length || 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="gradient-card rounded-xl p-4">
          <p className="text-[10px] text-muted-foreground uppercase font-bold">Revenue</p>
          <p className="text-xl font-bold text-primary">KES {totalRevenue.toLocaleString()}</p>
        </div>
        <div className="gradient-card rounded-xl p-4">
          <p className="text-[10px] text-muted-foreground uppercase font-bold">Orders</p>
          <p className="text-xl font-bold">{totalOrders}</p>
        </div>
        <div className="gradient-card rounded-xl p-4">
          <p className="text-[10px] text-muted-foreground uppercase font-bold">Success</p>
          <p className="text-xl font-bold text-primary">{successCount}</p>
        </div>
        <div className="gradient-card rounded-xl p-4">
          <p className="text-[10px] text-muted-foreground uppercase font-bold">Failed</p>
          <p className="text-xl font-bold text-destructive">{failedCount}</p>
        </div>
      </div>

      <div className="gradient-card rounded-xl p-4">
        <h3 className="font-bold text-sm mb-3">Recent Transactions</h3>
        <div className="space-y-2">
          {transactions?.slice(0, 15).map((tx) => (
            <div key={tx.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{tx.package_name}</p>
                <p className="text-xs text-muted-foreground">{tx.phone_number} • {format(new Date(tx.created_at), "MMM d, HH:mm")}</p>
              </div>
              <div className="flex items-center gap-2 ml-2">
                <span className={`text-xs font-bold ${tx.status === "completed" ? "text-primary" : tx.status === "failed" ? "text-destructive" : "text-warning"}`}>
                  KES {tx.amount}
                </span>
                <button onClick={() => onSendSms(tx)} className="p-1 rounded hover:bg-secondary" title="SMS">
                  <MessageSquare className="w-3.5 h-3.5 text-primary" />
                </button>
                <button onClick={() => { if(confirm("Delete?")) onDeleteTx(tx.id) }} className="p-1 rounded hover:bg-destructive/20" title="Delete">
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
