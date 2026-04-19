import { Zap } from "lucide-react";
import type { Product } from "@/lib/types";

interface KplcCardProps {
  product: Product;
  onSelect: (p: Product) => void;
}

const KplcCard = ({ product, onSelect }: KplcCardProps) => (
  <button
    type="button"
    onClick={() => onSelect(product)}
    className="group animate-slide-up rounded-xl gradient-card p-2.5 text-left transition-all hover:border-warning/40 hover:shadow-elevated"
  >
    <div className="mb-1.5 flex items-center gap-2">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-warning/20 bg-warning/10">
        <Zap className="h-3 w-3 text-warning" />
      </div>
      <h3 className="truncate font-display text-[12px] font-bold text-foreground">
        {product.name}
      </h3>
    </div>

    <div className="flex items-center justify-between">
      <p className="font-display text-sm font-bold text-foreground">
        <span className="mr-0.5 text-[10px] text-warning">KSH</span>
        {product.price.toLocaleString()}
      </p>
      <span className="text-[8px] font-medium tracking-wider text-muted-foreground">
        {product.units ?? "INSTANT"}
      </span>
    </div>
  </button>
);

export default KplcCard;
