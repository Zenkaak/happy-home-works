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
    className="relative rounded-xl border-2 border-warning/40 bg-[linear-gradient(160deg,hsl(var(--warning)/0.16),hsl(var(--card)))] p-3 text-left transition-all hover:border-warning hover:shadow-[0_10px_28px_-10px_hsl(var(--warning)/0.6)] hover:-translate-y-0.5 group animate-slide-up"
  >
    <ShareProductButton product={product} />
    <div className="flex items-center gap-1.5 mb-2">
      <div className="w-6 h-6 rounded-lg gradient-loud-amber flex items-center justify-center shrink-0 shadow-[0_2px_10px_-3px_hsl(var(--warning)/0.8)] transition-colors">
        <Zap className="w-3 h-3 text-warning-foreground" />
      </div>
      <h3 className="font-display font-bold text-[12px] text-foreground truncate flex-1">{product.name}</h3>
    </div>

    <div className="flex items-end justify-between gap-1">
      <p className="font-display font-extrabold text-base text-warning leading-none">
        <span className="text-warning text-[9px] mr-0.5 font-bold">KSH</span>{product.price.toLocaleString()}
      </p>
      <span className="text-[8px] text-muted-foreground font-semibold tracking-wider uppercase leading-none">Instant</span>
    </div>
  </button>
);

export default KplcCard;
