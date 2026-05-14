import { useState, useEffect, useMemo } from "react";
import { Send, Loader2, Search, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const getAdminToken = () => localStorage.getItem("dasnet_admin_token");

interface Contact {
  id: string;
  phone_number: string;
  created_at: string;
}

const AdminBulkSms = () => {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadContacts = async () => {
    const token = getAdminToken();
    if (!token) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-api", {
        body: { action: "list_broadcast_contacts" },
        headers: { "x-admin-token": token },
      });
      if (error) throw error;
      setContacts(data?.contacts ?? []);
    } catch {
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadContacts(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim();
    if (!q) return contacts;
    return contacts.filter(c => c.phone_number.includes(q));
  }, [contacts, search]);

  const removeContact = async (id: string, phone: string) => {
    if (!confirm(`Remove ${phone} from broadcast list?`)) return;
    const token = getAdminToken();
    if (!token) return;
    setRemovingId(id);
    try {
      const { error } = await supabase.functions.invoke("admin-api", {
        body: { action: "delete_broadcast_contact", id },
        headers: { "x-admin-token": token },
      });
      if (error) throw error;
      setContacts(prev => prev.filter(c => c.id !== id));
      toast({ title: "Removed", description: phone });
    } catch {
      toast({ title: "Failed to remove", variant: "destructive" });
    } finally {
      setRemovingId(null);
    }
  };

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

        <div className="text-xs text-muted-foreground">
          📱 Recipients: <span className="font-bold text-foreground">{contacts.length}</span> contacts
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
          disabled={sending || !message.trim() || contacts.length === 0}
          className="w-full py-3 rounded-lg gradient-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {sending ? "Broadcasting..." : `Send to ${contacts.length} Customers`}
        </button>
      </div>

      <div className="gradient-card rounded-xl p-4 space-y-3">
        <h3 className="font-bold text-sm flex items-center justify-between">
          <span>Broadcast Contacts</span>
          <span className="text-[10px] text-muted-foreground font-normal">{filtered.length}/{contacts.length}</span>
        </h3>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by phone number..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-secondary text-sm border border-border"
          />
        </div>

        {loading ? (
          <div className="text-center py-6 text-muted-foreground text-xs flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-xs">
            {search ? "No contacts match your search" : "No contacts yet"}
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto space-y-1.5">
            {filtered.map((c) => (
              <div key={c.id} className="flex items-center justify-between bg-secondary/60 rounded-lg px-3 py-2">
                <span className="text-sm font-mono">{c.phone_number}</span>
                <button
                  onClick={() => removeContact(c.id, c.phone_number)}
                  disabled={removingId === c.id}
                  className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive disabled:opacity-50"
                  aria-label={`Remove ${c.phone_number}`}
                >
                  {removingId === c.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminBulkSms;
