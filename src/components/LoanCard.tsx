import { TrendingUp } from "lucide-react";
import type { Product } from "@/lib/types";

interface LoanCardProps {
  product: Product;
  onSelect: (p: Product) => void;
}

const LoanCard = ({ product, onSelect }: LoanCardProps) => (
  <button
    onClick={() => onSelect(product)}
    className="gradient-card rounded-xl p-2.5 text-left transition-all hover:border-blue-500/30 group animate-slide-up"
  >
    <div className="flex items-center gap-2 mb-1.5">
      <div className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
        <TrendingUp className="w-3 h-3 text-blue-400" />
      </div>
      <h3 className="font-display font-bold text-[12px] text-foreground truncate">{product.name}</h3>
    </div>

    <div className="flex items-center justify-between">
      <p className="font-display font-bold text-sm text-foreground">
        <span className="text-blue-400 text-[10px] mr-0.5">KSH</span>{product.price.toLocaleString()}
      </p>
      <span className="text-[8px] text-muted-foreground font-medium tracking-wider">UPGRADE</span>
    </div>
  </button>
);

export default LoanCard;
