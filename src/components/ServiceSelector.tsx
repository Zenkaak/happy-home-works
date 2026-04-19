import { Wifi, Zap, TrendingUp } from "lucide-react";
import type { ServiceCategory } from "@/lib/types";

interface ServiceSelectorProps {
  selected: ServiceCategory;
  onChange: (cat: ServiceCategory) => void;
}

const services: { id: ServiceCategory; icon: typeof Wifi; label: string; desc: string }[] = [
  { id: "data", icon: Wifi, label: "Data Bundles", desc: "All networks" },
  { id: "kplc", icon: Zap, label: "KPLC Tokens", desc: "Electricity" },
  { id: "loans", icon: TrendingUp, label: "Loan Boost", desc: "Upgrades" },
];

const ServiceSelector = ({ selected, onChange }: ServiceSelectorProps) => (
  <div className="mx-auto grid max-w-2xl grid-cols-3 gap-2.5 px-4">
    {services.map((s) => {
      const active = selected === s.id;
      return (
        <button
          key={s.id}
          type="button"
          onClick={() => onChange(s.id)}
          className={`relative rounded-2xl p-3.5 text-center transition-all ${
            active
              ? "border border-primary/40 bg-primary/10 glow-primary"
              : "gradient-card hover:border-muted-foreground/30"
          }`}
        >
          <div
            className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
              active ? "border border-primary/30 bg-primary/20" : "bg-secondary"
            }`}
          >
            <s.icon
              className={`h-5 w-5 transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            />
          </div>
          <p
            className={`font-display text-xs font-bold transition-colors ${
              active ? "text-primary" : "text-foreground"
            }`}
          >
            {s.label}
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">{s.desc}</p>
        </button>
      );
    })}
  </div>
);

export default ServiceSelector;
