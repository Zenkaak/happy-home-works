import { Wifi, Zap, TrendingUp, Link2, Check } from "lucide-react";
import { useState } from "react";
import type { ServiceCategory } from "@/lib/types";
import { APP_PUBLIC_URL } from "@/lib/siteUrl";

interface ServiceSelectorProps {
  selected: ServiceCategory;
  onChange: (cat: ServiceCategory) => void;
  /** Categories to show. When omitted, all are shown. */
  visible?: ServiceCategory[];
}

const services: {
  id: ServiceCategory;
  icon: typeof Wifi;
  label: string;
  desc: string;
  path: string;
  tone: {
    card: string;
    iconWrap: string;
    icon: string;
    label: string;
    idle: string;
  };
}[] = [
  {
    id: "data",
    icon: Wifi,
    label: "Data Bundles",
    desc: "All networks",
    path: "/data",
    tone: {
      card: "bg-primary/10 border-primary/30",
      iconWrap: "bg-primary/15 border-primary/30",
      icon: "text-primary",
      label: "text-primary",
      idle: "text-primary/60",
    },
  },
  {
    id: "kplc",
    icon: Zap,
    label: "KPLC Tokens",
    desc: "Electricity",
    path: "/kplc",
    tone: {
      card: "bg-warning/10 border-warning/30",
      iconWrap: "bg-warning/15 border-warning/30",
      icon: "text-warning",
      label: "text-warning",
      idle: "text-warning/60",
    },
  },
  {
    id: "loans",
    icon: TrendingUp,
    label: "Loan Limits",
    desc: "Upgrades",
    path: "/fuliza",
    tone: {
      card: "bg-info/10 border-info/30",
      iconWrap: "bg-info/15 border-info/30",
      icon: "text-info",
      label: "text-info",
      idle: "text-info/60",
    },
  },
];

const getBase = () => {
  if (typeof window === "undefined") return APP_PUBLIC_URL;
  const o = window.location.origin;
  if (o.includes("localhost") || o.includes("id-preview--") || o.includes("lovable.app")) {
    return "https://hitechz.vercel.app";
  }
  return o;
};

const ServiceSelector = ({ selected, onChange, visible }: ServiceSelectorProps) => {
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

  const shown = visible ? services.filter((s) => visible.includes(s.id)) : services;
  if (shown.length === 0) return null;

  return (
    <div
    className={`grid w-full min-w-0 gap-2.5 px-4 ${
        shown.length === 1 ? "grid-cols-1" : shown.length === 2 ? "grid-cols-2" : "grid-cols-3"
      }`}
    >
      {shown.map((s) => {
        const active = selected === s.id;
        const copied = copiedId === s.id;
        return (
          <button
            key={s.id}
            onClick={() => onChange(s.id)}
            className={`relative min-w-0 overflow-hidden rounded-2xl border p-2.5 text-center transition-all sm:p-3.5 ${
              active ? s.tone.card : "gradient-card hover:border-muted-foreground/20"
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
              className="absolute right-1.5 top-1.5 z-10 cursor-pointer rounded-md border border-border/50 bg-background/70 p-1.5 backdrop-blur-sm transition-colors hover:border-foreground/20 hover:bg-background"
            >
              {copied ? (
                <Check className={`w-3 h-3 ${s.tone.icon}`} />
              ) : (
                <Link2 className="w-3 h-3 text-muted-foreground" />
              )}
            </span>

            <div className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
              active ? s.tone.iconWrap : "bg-secondary border-border"
            }`}>
              <s.icon className={`w-5 h-5 transition-colors ${active ? s.tone.icon : s.tone.idle}`} />
            </div>
            <p className={`truncate font-display font-semibold text-xs transition-colors ${active ? s.tone.label : "text-foreground"}`}>
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
