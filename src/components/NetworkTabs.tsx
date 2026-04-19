import type { NetworkProvider } from "@/lib/types";

interface NetworkTabsProps {
  selected: NetworkProvider;
  onChange: (n: NetworkProvider) => void;
}

const networks: { id: NetworkProvider; label: string; dotColor: string }[] = [
  { id: "safaricom", label: "Safaricom", dotColor: "bg-primary" },
  { id: "airtel", label: "Airtel", dotColor: "bg-accent" },
  { id: "telkom", label: "Telkom", dotColor: "bg-blue-500" },
];

const NetworkTabs = ({ selected, onChange }: NetworkTabsProps) => (
  <div className="flex items-center gap-1.5 px-4">
    <div className="inline-flex rounded-xl bg-secondary/60 border border-border/50 p-1 gap-0.5">
      {networks.map((n) => (
        <button
          key={n.id}
          onClick={() => onChange(n.id)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
            selected === n.id
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          {selected !== n.id && (
            <span className={`w-1.5 h-1.5 rounded-full ${n.dotColor}`} />
          )}
          {n.label}
        </button>
      ))}
    </div>
  </div>
);

export default NetworkTabs;
