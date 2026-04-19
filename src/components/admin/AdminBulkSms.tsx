import { useState, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const getAdminToken = () => localStorage.getItem("dasnet_admin_token");

const AdminBulkSms = () => {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [contactCount, setContactCount] = useState<number | null>(null);
  const [loadingContacts, setLoadingContacts] = useState(false);

  const fetchContactCount = async () => {
    const token = getAdminToken();
    if (!token) return;
    setLoadingContacts(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-api", {
        body: { action: "get_broadcast_contacts" },
        headers: { "x-admin-token": token },
      });
      if (error) throw error;
      setContactCount(data?.count ?? 0);
    } catch {
      setContactCount(null);
    } finally {
      setLoadingContacts(false);
    }
  };

  useEffect(() => { fetchContactCount(); }, []);

  const handleSend = async () => {
    const token = getAdminToken();
    if (!token || !message.trim()) return;

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-api", {
        body: { action: "broadcast_sms", message: message.trim() },
        headers: { "x-admin-token": token },
      });
      if (error) throw error;

      toast({
        title: "Broadcast complete",
        description: `Sent: ${data?.successCount ?? 0} | Failed: ${data?.failCount ?? 0}`,
      });
      if (data?.successCount > 0) setMessage("");
    } catch {
      toast({ title: "Broadcast failed", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="gradient-card rounded-xl p-4 space-y-3">
        <h3 className="font-bold text-sm text-primary flex items-center gap-2">
          <Send className="w-4 h-4" /> Broadcast to All Customers
        </h3>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>📱 Recipients:</span>
          {loadingContacts ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <span className="font-bold text-foreground">{contactCount ?? "—"} contacts</span>
          )}
        </div>

        <div>
          <label className="text-[10px] text-muted-foreground uppercase font-bold">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your broadcast message here..."
            rows={4}
            maxLength={320}
            className="w-full px-3 py-2 rounded-lg bg-secondary text-sm border border-border resize-none"
            disabled={sending}
          />
          <p className="text-[10px] text-muted-foreground mt-1">{message.length}/320 characters</p>
        </div>

        <button
          onClick={handleSend}
          disabled={sending || !message.trim() || !contactCount}
          className="w-full py-3 rounded-lg gradient-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {sending ? "Broadcasting..." : `Send to ${contactCount ?? 0} Customers`}
        </button>
      </div>

      <div className="gradient-card rounded-xl p-4">
        <h3 className="font-bold text-sm mb-2">ℹ️ Broadcast Notes</h3>
        <ul className="text-xs text-muted-foreground space-y-1.5">
          <li>• Message goes to all customers who have ever placed an order.</li>
          <li>• Each SMS costs KES 2 from your TextSMS balance.</li>
          <li>• Delivery logs appear in the SMS Logs tab.</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminBulkSms;
