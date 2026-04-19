import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Conversation {
  id: string;
  phone_number: string;
  subject: string;
  status: string;
  last_message_at: string;
}

interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_type: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

const ChatButton = () => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"phone" | "choice" | "chat" | "new">("phone");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvo, setActiveConvo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Check for phone in localStorage
  useEffect(() => {
    const saved = localStorage.getItem("dasnet_chat_phone");
    if (saved) setPhone(saved);
  }, []);

  // Scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Realtime messages
  useEffect(() => {
    if (!activeConvo) return;
    const channel = supabase
      .channel(`chat-${activeConvo.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${activeConvo.id}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new as ChatMessage]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeConvo]);

  const handlePhoneSubmit = async () => {
    if (!phone.trim() || phone.length < 10) return;
    setLoading(true);
    localStorage.setItem("dasnet_chat_phone", phone);

    const { data } = await supabase
      .from("chat_conversations")
      .select("*")
      .eq("phone_number", phone)
      .order("last_message_at", { ascending: false });

    setConversations(data || []);
    setLoading(false);

    if (data && data.length > 0) {
      setStep("choice");
    } else {
      setStep("new");
    }
  };

  const openConversation = async (convo: Conversation) => {
    setActiveConvo(convo);
    setStep("chat");
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", convo.id)
      .order("created_at", { ascending: true });
    setMessages(data || []);

    // Mark as read
    await supabase
      .from("chat_messages")
      .update({ is_read: true })
      .eq("conversation_id", convo.id)
      .eq("sender_type", "admin")
      .eq("is_read", false);
  };

  const createNewConversation = async () => {
    if (!subject.trim()) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("chat_conversations")
      .insert({ phone_number: phone, subject })
      .select()
      .single();

    if (data && !error) {
      setActiveConvo(data);
      setMessages([]);
      setStep("chat");
    }
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!newMsg.trim() || !activeConvo) return;
    const msg = newMsg.trim();
    setNewMsg("");

    await supabase.from("chat_messages").insert({
      conversation_id: activeConvo.id,
      sender_type: "user",
      message: msg,
    });

    await supabase
      .from("chat_conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", activeConvo.id);

    // Notify admin via SMS (best-effort)
    try {
      await supabase.functions.invoke("send-sms", {
        body: {
          phone: "254719841370",
          message: `DASNET: New chat message from ${phone}. Subject: ${activeConvo.subject}. Visit admin dashboard to reply.`,
          internal_chat_notify: true,
        },
      });
    } catch {
      // best-effort
    }
  };

  const resetChat = () => {
    setStep("phone");
    setActiveConvo(null);
    setMessages([]);
    setSubject("");
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
        aria-label="Chat Support"
      >
        {open ? <X className="w-6 h-6 text-primary-foreground" /> : <MessageCircle className="w-7 h-7 text-primary-foreground" />}
        {hasUnread && !open && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full animate-pulse" />
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-4 z-50 w-[340px] max-h-[480px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-primary px-4 py-3 flex items-center gap-2">
            {(step === "choice" || step === "chat" || step === "new") && (
              <button onClick={resetChat} className="text-primary-foreground">
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="flex-1">
              <p className="text-sm font-bold text-primary-foreground">DASNET Support</p>
              <p className="text-[10px] text-primary-foreground/70">We typically reply within minutes</p>
            </div>
          </div>

          {/* Phone step */}
          {step === "phone" && (
            <div className="p-4 space-y-3 flex-1">
              <p className="text-sm text-muted-foreground">Enter your phone number to start or continue a chat.</p>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 0712345678"
                className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm"
              />
              <button
                onClick={handlePhoneSubmit}
                disabled={loading || phone.length < 10}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continue"}
              </button>
            </div>
          )}

          {/* Choice step: existing convos found */}
          {step === "choice" && (
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <p className="text-xs text-muted-foreground px-1">Your conversations:</p>
              {conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => openConversation(c)}
                  className="w-full text-left p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                >
                  <p className="text-sm font-medium">{c.subject}</p>
                  <p className="text-[10px] text-muted-foreground">{c.status === "open" ? "🟢 Open" : "🔴 Closed"}</p>
                </button>
              ))}
              <button
                onClick={() => setStep("new")}
                className="w-full py-2.5 rounded-lg border border-primary/30 text-primary text-sm font-bold hover:bg-primary/10 transition-colors"
              >
                + New Request
              </button>
            </div>
          )}

          {/* New conversation step */}
          {step === "new" && (
            <div className="p-4 space-y-3 flex-1">
              <p className="text-sm text-muted-foreground">What do you need help with?</p>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Missing data bundle"
                className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-sm"
              />
              <button
                onClick={createNewConversation}
                disabled={loading || !subject.trim()}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Start Chat"}
              </button>
            </div>
          )}

          {/* Chat messages */}
          {step === "chat" && activeConvo && (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[320px]">
                {messages.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">Send a message to start the conversation.</p>
                )}
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.sender_type === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] px-3 py-2 rounded-xl text-sm ${
                      m.sender_type === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-secondary text-foreground rounded-bl-sm"
                    }`}>
                      {m.message}
                      <p className={`text-[9px] mt-0.5 ${m.sender_type === "user" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                        {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input */}
              <div className="p-2 border-t border-border flex gap-2">
                <input
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 rounded-lg bg-secondary border border-border text-sm"
                />
                <button onClick={sendMessage} disabled={!newMsg.trim()} className="p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default ChatButton;
