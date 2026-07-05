import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Send, ArrowLeft, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { getAppBaseUrl } from "@/lib/siteUrl";

const getAdminToken = () => localStorage.getItem("dasnet_admin_token");

interface Conversation {
  id: string;
  phone_number: string;
  subject: string;
  status: string;
  last_message_at: string;
  created_at: string;
}

interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const AdminChat = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeConvo, setActiveConvo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: conversations } = useQuery({
    queryKey: ["admin-chat-conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_conversations")
        .select("*")
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      return data as Conversation[];
    },
    refetchInterval: 10000,
  });

  // Realtime for new conversations
  useEffect(() => {
    const channel = supabase
      .channel("admin-chat-convos")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_conversations" }, () => {
        queryClient.invalidateQueries({ queryKey: ["admin-chat-conversations"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // Realtime messages for active convo
  useEffect(() => {
    if (!activeConvo) return;
    const channel = supabase
      .channel(`admin-chat-msg-${activeConvo.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${activeConvo.id}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new as ChatMessage]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeConvo]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const openConvo = async (convo: Conversation) => {
    setActiveConvo(convo);
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", convo.id)
      .order("created_at", { ascending: true });
    setMessages(data || []);

    // Mark user messages as read
    await supabase
      .from("chat_messages")
      .update({ is_read: true })
      .eq("conversation_id", convo.id)
      .eq("sender_type", "user")
      .eq("is_read", false);
  };

  const sendReply = async () => {
    if (!reply.trim() || !activeConvo) return;
    setSending(true);
    const msg = reply.trim();
    setReply("");

    await supabase.from("chat_messages").insert({
      conversation_id: activeConvo.id,
      sender_type: "admin",
      message: msg,
    });

    await supabase
      .from("chat_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", activeConvo.id);

    // Notify user via SMS
    const token = getAdminToken();
    if (token) {
      try {
        await supabase.functions.invoke("send-sms", {
          body: { phone: activeConvo.phone_number, message: `DASNET — Support Reply\n\nHello, our team has replied to your enquiry.\n\nView the response here:\n${getAppBaseUrl()}/vendor\n\nThank you for choosing DASNET.` },
          headers: { "x-admin-token": token },
        });
      } catch {
        // SMS notification is best-effort
      }
    }

    setSending(false);
  };

  if (activeConvo) {
    return (
      <div className="flex flex-col h-[60vh]">
        <div className="flex items-center gap-3 pb-3 border-b border-border mb-3">
          <button onClick={() => setActiveConvo(null)}>
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <p className="text-sm font-bold">{activeConvo.subject}</p>
            <p className="text-xs text-muted-foreground">{activeConvo.phone_number}</p>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 pr-1">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.sender_type === "admin" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] px-3 py-2 rounded-xl text-sm ${
                m.sender_type === "admin"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-secondary text-foreground rounded-bl-sm"
              }`}>
                {m.message}
                <p className={`text-[9px] mt-0.5 ${m.sender_type === "admin" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendReply()}
            placeholder="Type reply..."
            className="flex-1 px-3 py-2 rounded-lg bg-secondary border border-border text-sm"
          />
          <button onClick={sendReply} disabled={!reply.trim() || sending} className="p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground mb-3">Customer support conversations</p>
      {conversations?.length === 0 && <p className="text-xs text-muted-foreground text-center py-8">No conversations yet</p>}
      {conversations?.map((c) => (
        <button
          key={c.id}
          onClick={() => openConvo(c)}
          className="w-full text-left bg-secondary/30 border border-border rounded-lg p-3 hover:border-primary/30 transition-colors"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">{c.subject}</p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.status === "open" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
              {c.status}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{c.phone_number} • {format(new Date(c.last_message_at), "MMM d, h:mm a")}</p>
        </button>
      ))}
    </div>
  );
};

export default AdminChat;
