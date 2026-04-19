import { useState } from "react";
import { Loader2, X, CheckCircle2, Copy } from "lucide-react";
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

const ManualPaymentModal = ({ transactionId, phoneNumber, amount, packageName, onClose, onSubmitted }: Props) => {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const copyTill = () => {
    navigator.clipboard.writeText("8448104");
    toast({ title: "Till copied!", description: "8448104 (Dasnet Ventures)" });
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
      <div className="bg-card border border-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-display font-bold text-base">Pay via Till</h3>
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
              We're verifying your payment. You'll get an SMS confirmation in a moment.
            </p>
            <button onClick={onClose} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold">
              Done
            </button>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 space-y-3">
              <p className="text-xs uppercase tracking-wider font-bold text-primary">Step 1 — Pay on M-PESA</p>
              <ol className="text-sm space-y-1 text-foreground">
                <li>1. Lipa na M-PESA</li>
                <li>2. Buy Goods and Services</li>
                <li>3. Till Number: <span className="font-mono font-bold">8448104</span></li>
                <li>4. Amount: <span className="font-bold">KSH {amount.toLocaleString()}</span></li>
                <li>5. Confirm with PIN</li>
              </ol>
              <button onClick={copyTill} className="flex items-center gap-2 text-xs text-primary font-semibold hover:underline">
                <Copy className="w-3 h-3" /> Copy Till 8448104
              </button>
              <p className="text-[10px] text-muted-foreground">Recipient: <span className="font-semibold">DASNET VENTURES</span></p>
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
              <p className="text-[10px] text-muted-foreground">You'll find this in the M-PESA SMS you received.</p>
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
