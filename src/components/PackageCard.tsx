import { Wifi, Flame } from "lucide-react";
import type { Product } from "@/lib/types";

interface PackageCardProps {
  product: Product;
  onSelect: (p: Product) => void;
}

const PackageCard = ({ product, onSelect }: PackageCardProps) => (
  <button
    onClick={() => onSelect(product)}
    className="gradient-card rounded-xl p-2.5 text-left transition-all hover:border-primary/30 group animate-slide-up"
  >
    <div className="flex items-center gap-2 mb-1.5">
      <div className="w-6 h-6 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
        <Wifi className="w-3 h-3 text-primary" />
      </div>
      <h3 className="font-display font-bold text-[12px] text-foreground truncate">{product.name}</h3>
      {product.is_promo && (
        <Flame className="w-3 h-3 text-accent shrink-0" />
      )}
    </div>

    <div className="flex items-center justify-between">
      <p className="font-display font-bold text-sm text-foreground">
        <span className="text-primary text-[10px] mr-0.5">KSH</span>{product.price}
      </p>
      <span className="text-[8px] text-muted-foreground font-medium tracking-wider">NO EXPIRY</span>
    </div>
  </button>
);

export default PackageCard;
