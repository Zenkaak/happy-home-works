import { Zap } from "lucide-react";
import type { Product } from "@/lib/types";
import ShareProductButton from "@/components/ShareProductButton";

interface KplcCardProps {
  product: Product;
  onSelect: (p: Product) => void;
}

const KplcCard = ({ product, onSelect }: KplcCardProps) => (
  <button
    onClick={() => onSelect(product)}
    className="gradient-card rounded-xl p-3 text-left transition-all hover:border-warning/40 hover:shadow-[0_8px_24px_-12px_hsl(var(--warning)/0.4)] hover:-translate-y-0.5 group animate-slide-up"
  >
    <div className="flex items-center gap-1.5 mb-2">
      <div className="w-6 h-6 rounded-lg bg-warning/10 border border-warning/20 flex items-center justify-center shrink-0 group-hover:bg-warning/20 transition-colors">
        <Zap className="w-3 h-3 text-warning" />
      </div>
      <h3 className="font-display font-bold text-[12px] text-foreground truncate flex-1">{product.name}</h3>
    </div>

    <div className="flex items-end justify-between gap-1">
      <p className="font-display font-extrabold text-base text-foreground leading-none">
        <span className="text-warning text-[9px] mr-0.5 font-bold">KSH</span>{product.price.toLocaleString()}
      </p>
      <span className="text-[8px] text-muted-foreground font-semibold tracking-wider uppercase leading-none">Instant</span>
    </div>
  </button>
);

export default KplcCard;
