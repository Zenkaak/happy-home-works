import { Shield, Lock, BadgeCheck, Building2 } from "lucide-react";

const seals = [
  { icon: Shield, title: "M-Pesa Secured", sub: "Daraja API" },
  { icon: Lock, title: "256-bit SSL", sub: "Encrypted" },
  { icon: BadgeCheck, title: "Verified Vendor", sub: "Since 2023" },
  { icon: Building2, title: "Registered KE", sub: "Dasnet Ventures" },
];

const TrustSealsRow = () => (
  <div className="px-4">
    <div className="grid grid-cols-4 gap-1.5">
      {seals.map((s) => (
        <div
          key={s.title}
          className="flex flex-col items-center gap-1 px-1 py-2 rounded-lg bg-secondary/40 border border-border/50"
        >
          <s.icon className="w-3.5 h-3.5 text-primary" />
          <span className="text-[9px] font-bold text-foreground text-center leading-tight">{s.title}</span>
          <span className="text-[8px] text-muted-foreground text-center leading-none">{s.sub}</span>
        </div>
      ))}
    </div>
  </div>
);

export default TrustSealsRow;
