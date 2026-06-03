import { useState } from "react";
import { Wifi, Zap, TrendingUp, Share2, Check } from "lucide-react";
import type { ServiceCategory } from "@/lib/types";
import { shareTab, type ShareTab } from "@/lib/shareProduct";

interface ServiceSelectorProps {
  selected: ServiceCategory;
  onChange: (cat: ServiceCategory) => void;
}

const services: { id: ServiceCategory; icon: typeof Wifi; label: string; desc: string }[] = [
  { id: "data", icon: Wifi, label: "Data Bundles", desc: "All networks" },
  { id: "kplc", icon: Zap, label: "KPLC Tokens", desc: "Electricity" },
  { id: "loans", icon: TrendingUp, label: "Loan Limits", desc: "Upgrades" },
];

const ServiceSelector = ({ selected, onChange }: ServiceSelectorProps) => {
  const [copiedId, setCopiedId] = useState<ServiceCategory | null>(null);

  const handleShare = async (e: React.MouseEvent, id: ServiceCategory) => {
    e.stopPropagation();
    const result = await shareTab(id as ShareTab);
    if (result === "copied") {
      setCopiedId(id);
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-2.5 px-4">
      {services.map((s) => {
        const active = selected === s.id;
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
              onClick={(e) => handleShare(e, s.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleShare(e as unknown as React.MouseEvent, s.id);
                }
              }}
              aria-label={`Share ${s.label} link`}
              title="Share link"
              className="absolute top-1 right-1 z-10 p-1 rounded-md bg-background/70 backdrop-blur-sm border border-border/50 hover:bg-background hover:border-primary/40 transition-colors cursor-pointer"
            >
              {copiedId === s.id ? (
                <Check className="w-3 h-3 text-primary" />
              ) : (
                <Share2 className="w-3 h-3 text-muted-foreground" />
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
