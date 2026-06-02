import { TrendingUp } from "lucide-react";
import type { Product } from "@/lib/types";
import ShareProductButton from "@/components/ShareProductButton";

interface LoanCardProps {
  product: Product;
  onSelect: (p: Product) => void;
}

const LoanCard = ({ product, onSelect }: LoanCardProps) => (
  <button
    onClick={() => onSelect(product)}
    className="gradient-card rounded-xl p-3 text-left transition-all hover:border-blue-500/40 hover:shadow-[0_8px_24px_-12px_rgb(59_130_246/0.4)] hover:-translate-y-0.5 group animate-slide-up"
  >
    <div className="flex items-center gap-1.5 mb-2">
      <div className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 group-hover:bg-blue-500/20 transition-colors">
        <TrendingUp className="w-3 h-3 text-blue-400" />
      </div>
      <h3 className="font-display font-bold text-[12px] text-foreground truncate flex-1">{product.name}</h3>
    </div>

    <div className="flex items-end justify-between gap-1">
      <p className="font-display font-extrabold text-base text-foreground leading-none">
        <span className="text-blue-400 text-[9px] mr-0.5 font-bold">KSH</span>{product.price.toLocaleString()}
      </p>
      <span className="text-[8px] text-muted-foreground font-semibold tracking-wider uppercase leading-none">Upgrade</span>
    </div>
  </button>
);

export default LoanCard;
