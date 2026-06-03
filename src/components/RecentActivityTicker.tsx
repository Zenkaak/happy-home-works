import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Item = { name: string; pkg: string; ago: string };

const FALLBACK_NAMES = [
  "Brian K.", "Mary W.", "James O.", "Faith N.", "Peter M.", "Susan A.",
  "Daniel K.", "Grace W.", "John M.", "Lucy N.", "Kevin O.", "Joyce M.",
  "Ann W.", "Samuel K.", "Mercy A.", "Paul O.", "Caroline W.", "David M.",
];
// Populated from real DB products on mount; kept as a last-resort fallback only.
let FALLBACK_PKGS: string[] = ["KPLC Tokens KES 200", "Fuliza Upgrade"];

const maskName = (phone: string) => {
  // Use last 3 digits as deterministic name seed
  const seed = parseInt(phone.slice(-3), 10) || 0;
  return FALLBACK_NAMES[seed % FALLBACK_NAMES.length];
};

const freshAgo = (i: number) => {
  // Always recent: cycle through "just now", seconds, and a few minutes
  const cycle = i % 8;
  if (cycle === 0) return "just now";
  if (cycle < 4) return `${cycle * 7 + 3}s ago`;
  return `${cycle - 3}m ago`;
};


const RecentActivityTicker = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      // Load real product names so the ticker never invents packages we don't sell
      const { data: products } = await supabase
        .from("products")
        .select("name")
        .eq("is_visible", true);
      const pkgPool =
        products && products.length > 0
          ? products.map((p) => p.name as string)
          : FALLBACK_PKGS;
      if (products && products.length > 0) FALLBACK_PKGS = pkgPool;

      const { data: txns } = await supabase
        .from("transactions")
        .select("package_name, phone_number, created_at")
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(20);
      if (cancelled) return;

      const valid = new Set(pkgPool);
      const fromTxns = (txns ?? [])
        .filter((r) => r.package_name && valid.has(r.package_name as string))
        .map((r, i) => ({
          name: maskName(r.phone_number as string),
          pkg: r.package_name as string,
          ago: freshAgo(i),
        }));

      const filled: Item[] = [...fromTxns];
      let i = filled.length;
      while (filled.length < 12) {
        filled.push({
          name: FALLBACK_NAMES[i % FALLBACK_NAMES.length],
          pkg: pkgPool[i % pkgPool.length],
          ago: freshAgo(i),
        });
        i++;
      }
      setItems(filled);
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
        <span className="text-[10px] text-muted-foreground font-medium shrink-0">{freshAgo(idx)}</span>
      </div>
    </div>
  );
};

export default RecentActivityTicker;
