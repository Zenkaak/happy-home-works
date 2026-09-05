import type { NetworkProvider } from "@/lib/types";

interface NetworkTabsProps {
  selected: NetworkProvider;
  onChange: (n: NetworkProvider) => void;
}

const networks: {
  id: NetworkProvider;
  label: string;
  dotColor: string;
  activeClass: string;
}[] = [
  {
    id: "safaricom",
    label: "Safaricom",
    dotColor: "bg-primary",
    activeClass: "bg-primary text-primary-foreground shadow-md shadow-primary/25",
  },
  {
    id: "airtel",
    label: "Airtel",
    dotColor: "bg-accent",
    activeClass: "bg-accent text-accent-foreground shadow-md shadow-accent/25",
  },
  {
    id: "telkom",
    label: "Telkom",
    dotColor: "bg-info",
    activeClass: "bg-info text-info-foreground shadow-md shadow-info/25",
  },
];

const NetworkTabs = ({ selected, onChange }: NetworkTabsProps) => (
  <div className="flex w-full min-w-0 items-center gap-1.5 overflow-x-auto px-4 scrollbar-none">
    <div className="inline-flex shrink-0 gap-0.5 rounded-xl border border-border/50 bg-secondary/60 p-1">
      {networks.map((n) => (
        <button
          key={n.id}
          onClick={() => onChange(n.id)}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold tracking-wide transition-all sm:px-4 ${
            selected === n.id
              ? n.activeClass
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
