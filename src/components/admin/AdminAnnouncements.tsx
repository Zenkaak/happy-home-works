import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone, Loader2, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const getAdminToken = () => localStorage.getItem("dasnet_admin_token");

interface Announcement {
  id: string;
  title: string;
  message: string;
  is_active: boolean;
  created_at: string;
}

const AdminAnnouncements = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);

  const { data: announcements } = useQuery({
    queryKey: ["admin-announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Announcement[];
    },
  });

  const handleCreate = async () => {
    if (!title.trim() || !message.trim()) return;
    setCreating(true);
    const token = getAdminToken();
    const { error } = await supabase.functions.invoke("admin-api", {
      body: { action: "create_announcement", title: title.trim(), message: message.trim() },
      headers: { "x-admin-token": token! },
    });
    if (!error) {
      toast({ title: "Announcement created" });
      setTitle("");
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
    }
    setCreating(false);
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    const token = getAdminToken();
    await supabase.functions.invoke("admin-api", {
      body: { action: "toggle_announcement", id, is_active: !currentActive },
      headers: { "x-admin-token": token! },
    });
    queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
  };

  const deleteAnnouncement = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;
    const token = getAdminToken();
    await supabase.functions.invoke("admin-api", {
      body: { action: "delete_announcement", id },
      headers: { "x-admin-token": token! },
    });
    queryClient.invalidateQueries({ queryKey: ["admin-announcements"] });
  };

  return (
    <div className="space-y-4">
      <div className="bg-secondary/30 border border-border rounded-lg p-4 space-y-3">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-primary" /> New Announcement
        </h3>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm"
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Message..."
          rows={2}
          className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm resize-none"
        />
        <button
          onClick={handleCreate}
          disabled={creating || !title.trim() || !message.trim()}
          className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Publish Announcement"}
        </button>
      </div>

      <div className="space-y-2">
        {announcements?.map((a) => (
          <div key={a.id} className={`bg-secondary/30 border rounded-lg p-3 flex items-center gap-3 ${a.is_active ? "border-primary/30" : "border-border opacity-60"}`}>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{a.title}</p>
              <p className="text-xs text-muted-foreground truncate">{a.message}</p>
            </div>
            <button onClick={() => toggleActive(a.id, a.is_active)} className="p-1.5">
              {a.is_active ? <ToggleRight className="w-6 h-6 text-primary" /> : <ToggleLeft className="w-6 h-6 text-muted-foreground" />}
            </button>
            <button onClick={() => deleteAnnouncement(a.id)} className="p-1.5">
              <Trash2 className="w-4 h-4 text-destructive" />
            </button>
          </div>
        ))}
        {announcements?.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No announcements yet</p>}
      </div>
    </div>
  );
};

export default AdminAnnouncements;
