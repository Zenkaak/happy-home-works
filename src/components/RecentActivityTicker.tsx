import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Item = { name: string; pkg: string; ago: string };

const FALLBACK_NAMES = [
  "Brian K.", "Mary W.", "James O.", "Faith N.", "Peter M.", "Susan A.",
  "Daniel K.", "Grace W.", "John M.", "Lucy N.", "Kevin O.", "Joyce M.",
  "Ann W.", "Samuel K.", "Mercy A.", "Paul O.", "Caroline W.", "David M.",
];
const FALLBACK_PKGS = [
  "1.5GB Safaricom", "5GB Safaricom", "10GB Safaricom", "2GB Airtel",
  "KPLC Tokens KES 200", "Fuliza upgrade", "1GB + 30min", "8GB Weekly",
  "20GB Monthly", "350MB Daily", "KPLC Tokens KES 500",
];

const maskName = (phone: string) => {
  // Use last 3 digits as deterministic name seed
  const seed = parseInt(phone.slice(-3), 10) || 0;
  return FALLBACK_NAMES[seed % FALLBACK_NAMES.length];
};

const timeAgo = (iso: string) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.max(1, Math.floor(diff))}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const buildFallback = (): Item[] => {
  const out: Item[] = [];
  for (let i = 0; i < 12; i++) {
    const sec = 8 + i * 17;
    out.push({
      name: FALLBACK_NAMES[i % FALLBACK_NAMES.length],
      pkg: FALLBACK_PKGS[i % FALLBACK_PKGS.length],
      ago: sec < 60 ? `${sec}s ago` : `${Math.floor(sec / 60)}m ago`,
    });
  }
  return out;
};

const RecentActivityTicker = () => {
  const [items, setItems] = useState<Item[]>(buildFallback());
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("transactions")
        .select("package_name, phone_number, created_at")
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(20);
      if (cancelled) return;
      if (data && data.length > 0) {
        setItems(
          data.map((r) => ({
            name: maskName(r.phone_number as string),
            pkg: r.package_name as string,
            ago: timeAgo(r.created_at as string),
          }))
        );
      }
    };
    load();
    const refresh = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(refresh);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % Math.max(1, items.length)), 3500);
    return () => clearInterval(id);
  }, [items.length]);

  const current = items[idx % items.length];
  if (!current) return null;

  return (
    <div className="px-4">
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/10 border border-success/25 overflow-hidden">
        <div className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
        </div>
        <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
        <div key={idx} className="flex-1 overflow-hidden animate-in fade-in slide-in-from-bottom-1 duration-500">
          <p className="text-[11px] text-foreground font-semibold truncate">
            <span className="text-success">{current.name}</span>
            <span className="text-muted-foreground"> just bought </span>
            <span className="font-bold">{current.pkg}</span>
          </p>
        </div>
        <span className="text-[10px] text-muted-foreground font-medium shrink-0">{current.ago}</span>
      </div>
    </div>
  );
};

export default RecentActivityTicker;
