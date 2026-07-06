import { useState } from "react";
import { Send, Loader2, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isValidKenyanPhone, formatPhoneTo254 } from "@/lib/formatPhone";
import { useToast } from "@/hooks/use-toast";
import { initiateStkPush } from "@/lib/stk";

type StkStatus = "idle" | "sending" | "sent" | "error";

const AdminStkPrompt = () => {
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [accountRef, setAccountRef] = useState("DASNET");
  const [status, setStatus] = useState<StkStatus>("idle");

  const handleSend = async () => {
    if (!isValidKenyanPhone(phone)) {
      toast({ title: "Invalid phone", description: "Enter a valid Kenyan phone number", variant: "destructive" });
      return;
    }
    if (!amount || Number(amount) < 1) {
      toast({ title: "Invalid amount", description: "Enter a valid amount", variant: "destructive" });
      return;
    }

    setStatus("sending");
    try {
      // Create a transaction record
      const { data: tx, error: txError } = await supabase.from("transactions").insert({
        phone_number: formatPhoneTo254(phone),
        amount: Number(amount),
        package_name: `Custom STK - ${accountRef}`,
        category: "data",
        status: "processing",
      }).select().single();

      if (txError) throw txError;

      await initiateStkPush({
        phone: formatPhoneTo254(phone),
        amount: Number(amount),
        transaction_id: tx.id,
        account_ref: accountRef,
      });

      setStatus("sent");
      toast({ title: "STK push sent!", description: `Prompt sent to ${formatPhoneTo254(phone)}` });

      // Reset after 3s
      setTimeout(() => {
        setStatus("idle");
        setPhone("");
        setAmount("");
      }, 3000);
    } catch (err: any) {
      console.error("Custom STK error:", err);
      setStatus("error");
      toast({ title: "STK push failed", description: err.message || "Try again", variant: "destructive" });
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  return (
    <div className="gradient-card rounded-xl p-5">
      <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
        📲 Custom STK Prompt
        <span className="text-[10px] text-primary font-bold px-2 py-0.5 rounded-full bg-primary/10">ADMIN</span>
      </h3>

      <div className="space-y-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1 uppercase tracking-wider">Phone Number</label>
          <input
            type="tel"
            placeholder="07XXXXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-secondary text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={status === "sending"}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1 uppercase tracking-wider">Amount (KES)</label>
            <input
              type="number"
              placeholder="100"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-secondary text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={status === "sending"}
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1 uppercase tracking-wider">Account Ref</label>
            <input
              type="text"
              placeholder="DASNET"
              value={accountRef}
              onChange={(e) => setAccountRef(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-secondary text-sm border border-border focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={status === "sending"}
            />
          </div>
        </div>

        <button
          onClick={handleSend}
          disabled={status === "sending"}
          className="w-full py-3 rounded-xl gradient-primary font-bold text-sm text-primary-foreground hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {status === "sending" ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
          ) : status === "sent" ? (
            <><CheckCircle className="w-4 h-4" /> Sent!</>
          ) : status === "error" ? (
            <><XCircle className="w-4 h-4" /> Failed — Try Again</>
          ) : (
            <><Send className="w-4 h-4" /> Send STK Push</>
          )}
        </button>
      </div>
    </div>
  );
};

export default AdminStkPrompt;
