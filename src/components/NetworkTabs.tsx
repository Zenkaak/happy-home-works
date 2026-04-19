import type { NetworkProvider } from "@/lib/types";

interface NetworkTabsProps {
  selected: NetworkProvider;
  onChange: (n: NetworkProvider) => void;
}

const networks: { id: NetworkProvider; label: string; dotColor: string }[] = [
  { id: "safaricom", label: "Safaricom", dotColor: "bg-primary" },
  { id: "airtel", label: "Airtel", dotColor: "bg-accent" },
  { id: "telkom", label: "Telkom", dotColor: "bg-info" },
];

const NetworkTabs = ({ selected, onChange }: NetworkTabsProps) => (
  <div className="mx-auto flex max-w-2xl items-center px-4">
    <div className="inline-flex gap-0.5 rounded-xl border border-border/50 bg-secondary/60 p-1">
      {networks.map((n) => {
        const active = selected === n.id;
        return (
          <button
            key={n.id}
            type="button"
            onClick={() => onChange(n.id)}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold tracking-wide transition-all ${
              active
                ? "bg-primary text-primary-foreground shadow-lg glow-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            {!active && <span className={`h-1.5 w-1.5 rounded-full ${n.dotColor}`} />}
            {n.label}
          </button>
        );
      })}
    </div>
  </div>
);

export default NetworkTabs;
