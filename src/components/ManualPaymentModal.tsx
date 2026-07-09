import { useState } from "react";
import { Loader2, X, CheckCircle2, Copy, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  transactionId?: string;
  phoneNumber: string;
  amount: number;
  packageName: string;
  onClose: () => void;
  onSubmitted?: () => void;
}

const PAYBILL = "4018275";
const RECIPIENT = "DASNET";

const ManualPaymentModal = ({ transactionId, phoneNumber, amount, packageName, onClose, onSubmitted }: Props) => {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Account = the receiving phone number so admins can match the payment to the order
  const accountNumber = phoneNumber.replace(/[^0-9]/g, "").slice(-9);

  const copy = (value: string, label: string) => {
    navigator.clipboard.writeText(value);
    toast({ title: `${label} copied`, description: value });
  };

  const submit = async () => {
    if (code.trim().length < 8) {
      toast({ title: "Enter a valid M-PESA code", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("manual-payment", {
        body: {
          action: "submit",
          transaction_id: transactionId,
          phone_number: phoneNumber,
          amount,
          mpesa_code: code,
          package_name: packageName,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setDone(true);
      onSubmitted?.();
    } catch (e: any) {
      toast({ title: "Could not submit", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-background/95 backdrop-blur-sm flex items-end sm:items-center justify-center p-3">
      <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-card">
          <h3 className="font-display font-bold text-base">Pay via Paybill (SIM Toolkit)</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary">
            <X className="w-4 h-4" />
          </button>
        </div>

        {done ? (
          <div className="p-6 text-center space-y-3">
            <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-primary" />
            </div>
            <h4 className="font-bold">Submitted!</h4>
            <p className="text-sm text-muted-foreground">
              We're verifying your payment. You'll get an SMS confirmation shortly.
            </p>
            <button onClick={onClose} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold">
              Done
            </button>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-primary" />
                <p className="text-xs uppercase tracking-wider font-bold text-primary">Step 1 — Use M-PESA SIM Toolkit</p>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Works even without internet — just open your SIM's M-PESA menu.
              </p>
              <ol className="text-sm space-y-1.5 text-foreground">
                <li>1. Open <span className="font-bold">SIM Toolkit → M-PESA</span></li>
                <li>2. <span className="font-bold">Lipa na M-PESA</span></li>
                <li>3. <span className="font-bold">Pay Bill</span></li>
                <li>4. Business No: <span className="font-mono font-bold">{PAYBILL}</span></li>
                <li>5. Account No: <span className="font-mono font-bold">{accountNumber}</span></li>
                <li>6. Amount: <span className="font-bold">KSH {amount.toLocaleString()}</span></li>
                <li>7. Enter your M-PESA PIN and confirm</li>
              </ol>
              <div className="flex flex-wrap gap-2 pt-1">
                <button onClick={() => copy(PAYBILL, "Paybill")} className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/15">
                  <Copy className="w-3 h-3" /> Paybill {PAYBILL}
                </button>
                <button onClick={() => copy(accountNumber, "Account")} className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/15">
                  <Copy className="w-3 h-3" /> Account {accountNumber}
                </button>
                <button onClick={() => copy(String(amount), "Amount")} className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/15">
                  <Copy className="w-3 h-3" /> KSH {amount}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground">Recipient: <span className="font-semibold">{RECIPIENT}</span></p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Step 2 — Paste M-PESA confirmation code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. SK4XYZAB12"
                className="w-full px-3 py-3 rounded-lg bg-secondary border border-border font-mono text-sm uppercase focus:outline-none focus:ring-2 focus:ring-primary"
                maxLength={15}
              />
              <p className="text-[10px] text-muted-foreground">
                Once you get back online, paste the M-PESA SMS code and submit — we'll deliver instantly.
              </p>
            </div>

            <button
              onClick={submit}
              disabled={submitting || code.trim().length < 8}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Submit Payment
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManualPaymentModal;
