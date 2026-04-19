import { Clock, ShieldCheck, MessageSquare, CheckCircle } from "lucide-react";

const features = [
  { icon: ShieldCheck, title: "Verified", color: "text-primary" },
  { icon: Clock, title: "Instant", color: "text-primary" },
  { icon: CheckCircle, title: "99.9% Up", color: "text-primary" },
  { icon: MessageSquare, title: "SMS Receipt", color: "text-primary" },
];

const FeatureBadges = () => (
  <div className="px-4 py-2">
    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
      {features.map((f) => (
        <div
          key={f.title}
          className="flex items-center gap-1 px-2 py-1 rounded-full bg-secondary/60 border border-border/50 shrink-0"
        >
          <f.icon className={`w-3 h-3 ${f.color}`} />
          <span className="text-[10px] font-semibold text-foreground whitespace-nowrap">{f.title}</span>
        </div>
      ))}
    </div>
  </div>
);

export default FeatureBadges;
