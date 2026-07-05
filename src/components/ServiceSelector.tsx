import { Wifi, Zap, TrendingUp, Link2, Check } from "lucide-react";
import { useState } from "react";
import type { ServiceCategory } from "@/lib/types";
import { APP_PUBLIC_URL } from "@/lib/siteUrl";

interface ServiceSelectorProps {
  selected: ServiceCategory;
  onChange: (cat: ServiceCategory) => void;
}

const services: {
  id: ServiceCategory;
  icon: typeof Wifi;
  label: string;
  desc: string;
  path: string;
}[] = [
  { id: "data", icon: Wifi, label: "Data Bundles", desc: "All networks", path: "/data" },
  { id: "kplc", icon: Zap, label: "KPLC Tokens", desc: "Electricity", path: "/kplc" },
  { id: "loans", icon: TrendingUp, label: "Loan Limits", desc: "Upgrades", path: "/fuliza" },
];

const getBase = () => {
  if (typeof window === "undefined") return APP_PUBLIC_URL;
  const o = window.location.origin;
  if (o.includes("localhost") || o.includes("id-preview--") || o.includes("lovable.app")) {
    return "https://hitechz.vercel.app";
  }
  return o;
};

const ServiceSelector = ({ selected, onChange }: ServiceSelectorProps) => {
  const [copiedId, setCopiedId] = useState<ServiceCategory | null>(null);

  const copy = async (e: React.MouseEvent, s: (typeof services)[number]) => {
    e.stopPropagation();
    const url = `${getBase()}${s.path}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `DASNET ${s.label}`, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      try { await navigator.clipboard.writeText(url); } catch { /* noop */ }
    }
    setCopiedId(s.id);
    setTimeout(() => setCopiedId((c) => (c === s.id ? null : c)), 1500);
  };

  return (
    <div className="grid grid-cols-3 gap-2.5 px-4">
      {services.map((s) => {
        const active = selected === s.id;
        const copied = copiedId === s.id;
        return (
          <button
            key={s.id}
            onClick={() => onChange(s.id)}
            className={`relative rounded-2xl p-3.5 text-center transition-all ${
              active
                ? "bg-primary/10 border border-primary/30 shadow-[0_0_20px_hsl(var(--primary)/0.1)]"
                : "gradient-card hover:border-muted-foreground/20"
            }`}
          >
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => copy(e, s)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") copy(e as any, s);
              }}
              aria-label={`Copy ${s.label} link`}
              title="Copy share link"
              className="absolute top-1.5 right-1.5 z-10 p-1.5 rounded-md bg-background/70 backdrop-blur-sm border border-border/50 hover:bg-background hover:border-primary/40 transition-colors cursor-pointer"
            >
              {copied ? (
                <Check className="w-3 h-3 text-primary" />
              ) : (
                <Link2 className="w-3 h-3 text-muted-foreground" />
              )}
            </span>

            <div className={`fire-icon fire-square w-10 h-10 mx-auto mb-2 transition-colors ${
              active
                ? "bg-primary/20 border border-primary/30"
                : "bg-secondary"
            }`}>
              <s.icon className={`w-5 h-5 transition-colors ${active ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <p className={`font-display font-bold text-xs transition-colors ${active ? "text-primary" : "text-foreground"}`}>
              {s.label}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{s.desc}</p>
          </button>
        );
      })}
    </div>
  );
};

export default ServiceSelector;
