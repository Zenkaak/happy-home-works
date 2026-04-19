import { Eye, Trash2, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import type { Transaction } from "@/lib/types";

interface AdminTransactionsProps {
  transactions: Transaction[] | undefined;
  onViewTx: (tx: Transaction) => void;
  onSendSms: (tx: Transaction) => void;
  onDeleteTx: (id: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
}

const AdminTransactions = ({ transactions, onViewTx, onSendSms, onDeleteTx, onUpdateStatus }: AdminTransactionsProps) => {
  return (
    <div className="space-y-3">
      {transactions?.map((tx) => (
        <div key={tx.id} className="gradient-card rounded-xl p-4 animate-slide-up">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-bold text-sm">{tx.package_name}</p>
              <p className="text-xs text-muted-foreground">{tx.phone_number} • {format(new Date(tx.created_at), "MMM d, h:mm a")}</p>
            </div>
            <div className="text-right">
              <p className="font-bold">KES {tx.amount}</p>
              <select 
                value={tx.status} 
                onChange={(e) => onUpdateStatus(tx.id, e.target.value)}
                className={`text-[10px] font-bold uppercase rounded border border-border bg-secondary/50 px-1 py-0.5 ${tx.status === "completed" ? "text-primary" : tx.status === "failed" ? "text-destructive" : "text-warning"}`}
              >
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
          {tx.mpesa_reference && (
            <p className="text-xs text-muted-foreground mt-2">Ref: <span className="text-primary font-mono">{tx.mpesa_reference}</span></p>
          )}
          <div className="mt-3 flex items-center justify-end gap-1">
            <button onClick={() => onViewTx(tx)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
              <Eye className="w-4 h-4 text-muted-foreground" />
            </button>
            <button onClick={() => onSendSms(tx)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
              <MessageSquare className="w-4 h-4 text-primary" />
            </button>
            <button 
              onClick={() => { if(confirm("Delete transaction record?")) onDeleteTx(tx.id) }} 
              className="p-1.5 rounded-lg hover:bg-destructive/20 transition-colors"
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AdminTransactions;
