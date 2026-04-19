import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Announcement {
  id: string;
  title: string;
  message: string;
  is_active: boolean;
}

const AnnouncementToast = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchAnnouncements = async () => {
      const { data } = await supabase
        .from("announcements")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (data) setAnnouncements(data);
    };
    fetchAnnouncements();

    const channel = supabase
      .channel("announcements-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => {
        fetchAnnouncements();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Auto-dismiss after 4 seconds
  useEffect(() => {
    const visible = announcements.filter((a) => a.is_active && !dismissed.has(a.id));
    if (visible.length === 0) return;
    const timers = visible.map((a) =>
      setTimeout(() => setDismissed((prev) => new Set(prev).add(a.id)), 4000)
    );
    return () => timers.forEach(clearTimeout);
  }, [announcements, dismissed]);

  const dismiss = (id: string) => setDismissed((prev) => new Set(prev).add(id));

  const visible = announcements.filter((a) => a.is_active && !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-md space-y-2">
      {visible.map((a) => (
        <SwipeToast key={a.id} onDismiss={() => dismiss(a.id)}>
          <div className="bg-primary text-primary-foreground rounded-xl px-4 py-3 shadow-2xl flex items-start gap-3">
            <div className="flex-1">
              <p className="font-bold text-sm">📢 {a.title}</p>
              <p className="text-xs mt-0.5 opacity-90">{a.message}</p>
            </div>
          </div>
        </SwipeToast>
      ))}
    </div>
  );
};

function SwipeToast({ children, onDismiss }: { children: React.ReactNode; onDismiss: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const currentX = useRef(0);
  const swiping = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    currentX.current = 0;
    swiping.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swiping.current || !ref.current) return;
    currentX.current = e.touches[0].clientX - startX.current;
    ref.current.style.transform = `translateX(${currentX.current}px)`;
    ref.current.style.opacity = `${Math.max(0, 1 - Math.abs(currentX.current) / 200)}`;
  };

  const handleTouchEnd = () => {
    swiping.current = false;
    if (Math.abs(currentX.current) > 80) {
      onDismiss();
    } else if (ref.current) {
      ref.current.style.transform = "translateX(0)";
      ref.current.style.opacity = "1";
    }
  };

  return (
    <div
      ref={ref}
      className="transition-transform duration-200 animate-in slide-in-from-top-5"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  );
}

export default AnnouncementToast;
