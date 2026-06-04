import { TrendingUp } from "lucide-react";
import type { Product } from "@/lib/types";
import ShareProductButton from "@/components/ShareProductButton";

interface LoanCardProps {
  product: Product;
  onSelect: (p: Product) => void;
}

function loanLimitFromName(name: string): string | null {
  const m = name.match(/(\d+)\s*K/i);
  if (!m) return null;
  return (parseInt(m[1], 10) * 1000).toLocaleString();
}

const LoanCard = ({ product, onSelect }: LoanCardProps) => {
  const limit = loanLimitFromName(product.name);
  return (
    <button
      onClick={() => onSelect(product)}
      className="relative gradient-card rounded-xl p-3 text-left transition-all hover:border-blue-500/40 hover:shadow-[0_8px_24px_-12px_rgb(59_130_246/0.4)] hover:-translate-y-0.5 group animate-slide-up"
    >
      <ShareProductButton product={product} />
      <div className="flex items-center gap-1.5 mb-2">
        <div className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 group-hover:bg-blue-500/20 transition-colors">
          <TrendingUp className="w-3 h-3 text-blue-400" />
        </div>
        <h3 className="font-display font-bold text-[12px] text-foreground truncate flex-1">{product.name}</h3>
      </div>

      {limit && (
        <p className="font-display font-extrabold text-lg text-foreground leading-none mb-1">
          <span className="text-blue-400 text-[9px] mr-0.5 font-bold">UP TO KSH</span>{limit}
        </p>
      )}

      <div className="flex items-end justify-between gap-1">
        <p className="text-[10px] text-muted-foreground leading-none">
          Fee: <span className="text-foreground font-bold">KSH {product.price.toLocaleString()}</span>
        </p>
        <span className="text-[8px] text-blue-400 font-bold tracking-wider uppercase leading-none">Activate</span>
      </div>
    </button>
  );
};

export default LoanCard;
