import {
  CheckCircle,
  XCircle,
  Loader2,
  Phone,
  Calendar,
  Hash,
  CreditCard,
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import type { Transaction } from "@/lib/types";

interface TransactionDetailModalProps {
  transaction: Transaction;
  onClose: () => void;
  onDelete?: (id: string) => void;
  onResendStk?: (tx: Transaction) => void;
  showAdminActions?: boolean;
}

const TransactionDetailModal = ({
  transaction: tx,
  onClose,
  onDelete,
  onResendStk,
  showAdminActions
}: TransactionDetailModalProps) => {

  // Mask phone numbers like 0723***545
  const maskPhone = (phone?: string) => {
    if (!phone) return "";
    return phone.replace(/(\d{4})\d{3}(\d{3})/, "$1***$2");
  };

  const statusConfig = {
    completed: {
      icon: CheckCircle,
      color: "text-primary",
      bg: "bg-primary/10",
      label: "Completed"
    },
    failed: {
      icon: XCircle,
      color: "text-destructive",
      bg: "bg-destructive/10",
      label: "Failed"
    },
    processing: {
      icon: Loader2,
      color: "text-warning",
      bg: "bg-warning/10",
      label: "Processing"
    },
    pending: {
      icon: Loader2,
      color: "text-warning",
      bg: "bg-warning/10",
      label: "Pending"
    }
  };

  const status = statusConfig[tx.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-card rounded-2xl overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`p-6 text-center ${
            tx.status === "completed"
              ? "bg-primary/20"
              : tx.status === "failed"
              ? "bg-destructive/20"
              : "bg-warning/20"
          }`}
        >
          <StatusIcon
            className={`w-12 h-12 mx-auto mb-2 ${status.color} ${
              tx.status === "processing" ? "animate-spin" : ""
            }`}
          />

          <h2 className="font-display text-xl font-bold">
            {tx.package_name}
          </h2>

          <span
            className={`inline-block mt-2 px-3 py-1 rounded-full ${status.bg} ${status.color} text-xs font-bold uppercase`}
          >
            {status.label}
          </span>
        </div>

        {/* Details */}
        <div className="p-5 space-y-3">
          <div className="space-y-2">

            <DetailRow
              icon={Hash}
              label="Order ID"
              value={`#${tx.order_number}`}
            />

            <DetailRow
              icon={CreditCard}
              label="Amount"
              value={`KSH ${tx.amount}`}
            />

            <DetailRow
              icon={Phone}
              label="Phone"
              value={maskPhone(tx.phone_number)}
            />

            {tx.service_number &&
              tx.service_number !== tx.phone_number && (
                <DetailRow
                  icon={Phone}
                  label="Service Number"
                  value={maskPhone(tx.service_number)}
                />
              )}

            {tx.meter_number && (
              <DetailRow
                icon={Hash}
                label="Meter Number"
                value={tx.meter_number.length > 4 ? tx.meter_number.slice(0, 4) + "****" + tx.meter_number.slice(-4) : tx.meter_number}
              />
            )}

            <DetailRow
              icon={Calendar}
              label="Date"
              value={format(
                new Date(tx.created_at),
                "MMM d, yyyy 'at' h:mm a"
              )}
            />

            {tx.network && (
              <DetailRow
                icon={null}
                label="Network"
                value={tx.network.toUpperCase()}
              />
            )}

            <DetailRow
              icon={null}
              label="Category"
              value={tx.category.toUpperCase()}
            />

          </div>

          {/* M-Pesa Reference */}
          {tx.mpesa_reference && (
            <div className="border-t border-border pt-3">
              <p className="text-[10px] text-primary uppercase tracking-wider mb-1">
                M-PESA RECEIPT
              </p>

              <div className="bg-secondary rounded-lg px-3 py-2">
                <span className="text-sm font-mono font-bold">
                  {tx.mpesa_reference}
                </span>
              </div>
            </div>
          )}

          {/* KPLC Token */}
          {tx.kplc_token && (
            <div>
              <p className="text-[10px] text-warning uppercase tracking-wider mb-1">
                KPLC TOKEN
              </p>

              <div className="bg-secondary rounded-lg px-3 py-2">
                <span className="text-sm font-mono font-bold tracking-widest">
                  {tx.kplc_token}
                </span>
              </div>
            </div>
          )}

          {/* Failure Reason */}
          {tx.failure_reason && (
            <div>
              <p className="text-[10px] text-destructive uppercase tracking-wider mb-1">
                FAILURE REASON
              </p>

              <div className="flex items-center gap-2 bg-destructive/10 rounded-lg px-3 py-2 border border-destructive/20">
                <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
                <span className="text-sm text-destructive">
                  {tx.failure_reason}
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">

            {showAdminActions &&
              tx.status === "failed" &&
              onResendStk && (
                <button
                  onClick={() => onResendStk(tx)}
                  className="flex-1 py-3 rounded-xl gradient-primary font-bold text-sm text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  Resend STK
                </button>
              )}

            {onDelete && (
              <button
                onClick={() => {
                  onDelete(tx.id);
                  onClose();
                }}
                className="flex-1 py-3 rounded-xl bg-destructive/10 text-destructive font-medium text-sm hover:bg-destructive/20 transition-colors"
              >
                Delete
              </button>
            )}

            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-secondary font-medium text-sm hover:bg-muted transition-colors"
            >
              Close
            </button>

          </div>
        </div>
      </div>
    </div>
  );
};

const DetailRow = ({
  icon: Icon,
  label,
  value
}: {
  icon: any;
  label: string;
  value: string;
}) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-muted-foreground flex items-center gap-2">
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {label}
    </span>

    <span className="font-medium">{value}</span>
  </div>
);

export default TransactionDetailModal; 
