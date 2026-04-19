import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Announcement {
  id: string;
  title: string;
  message: string;
}

const AnnouncementBanner = () => {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase
      .from("announcements")
      .select("id, title, message")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (mounted && data) setAnnouncement(data);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (!announcement) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-3 py-2">
        <span className="text-xs">🔥</span>
        <p className="text-[11px] font-medium text-primary">
          Cheapest data bundles in Kenya — instant delivery, 24/7!
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2">
      <Megaphone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wide text-primary">
          {announcement.title}
        </p>
        <p className="text-[11px] leading-snug text-foreground/90">{announcement.message}</p>
      </div>
    </div>
  );
};

export default AnnouncementBanner;
