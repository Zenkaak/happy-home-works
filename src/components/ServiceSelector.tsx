import { Wifi, Zap, TrendingUp } from "lucide-react";
import type { ServiceCategory } from "@/lib/types";

interface ServiceSelectorProps {
  selected: ServiceCategory;
  onChange: (cat: ServiceCategory) => void;
}

const services: { id: ServiceCategory; icon: typeof Wifi; label: string; desc: string }[] = [
  { id: "data", icon: Wifi, label: "Data Bundles", desc: "All networks" },
  { id: "kplc", icon: Zap, label: "KPLC Tokens", desc: "Electricity" },
  { id: "loans", icon: TrendingUp, label: "Loan Limits", desc: "Upgrades" },
];

const ServiceSelector = ({ selected, onChange }: ServiceSelectorProps) => (
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
          <div className={`w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center transition-colors ${
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

export default ServiceSelector;
