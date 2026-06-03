import { Zap, ShieldCheck, Headphones } from "lucide-react";

const items = [
  { icon: Zap, label: "Avg delivery", value: "12s" },
  { icon: ShieldCheck, label: "Secured by", value: "M-Pesa" },
  { icon: Headphones, label: "Support", value: "24/7" },
];


const TrustStrip = () => (
  <div className="border-b border-border/50 bg-secondary/30 backdrop-blur-sm overflow-hidden">
    <div className="flex items-center gap-6 px-4 py-1.5 animate-marquee whitespace-nowrap">
      {[...items, ...items].map((it, i) => (
        <div key={i} className="flex items-center gap-1.5 shrink-0">
          <it.icon className="w-3 h-3 text-primary" />
          <span className="text-[10px] text-muted-foreground font-medium">
            {it.label} <span className="text-foreground font-bold">{it.value}</span>
          </span>
        </div>
      ))}
    </div>
  </div>
);

export default TrustStrip;
