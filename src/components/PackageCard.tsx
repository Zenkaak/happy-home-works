import { Wifi, Flame, Phone } from "lucide-react";
import type { Product } from "@/lib/types";

interface PackageCardProps {
  product: Product;
  onSelect: (p: Product) => void;
}

const PackageCard = ({ product, onSelect }: PackageCardProps) => {
  const hasMinutes = !!product.minutes;
  return (
    <button
      type="button"
      onClick={() => onSelect(product)}
      className="group animate-slide-up rounded-xl gradient-card p-2.5 text-left transition-all hover:border-primary/40 hover:shadow-elevated"
    >
      <div className="mb-1.5 flex items-center gap-2">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10">
          {hasMinutes ? (
            <Phone className="h-3 w-3 text-primary" />
          ) : (
            <Wifi className="h-3 w-3 text-primary" />
          )}
        </div>
        <h3 className="truncate font-display text-[12px] font-bold text-foreground">
          {product.name}
        </h3>
        {product.is_promo && <Flame className="h-3 w-3 shrink-0 text-accent" />}
      </div>

      <div className="flex items-center justify-between">
        <p className="font-display text-sm font-bold text-foreground">
          <span className="mr-0.5 text-[10px] text-primary">KSH</span>
          {product.price}
        </p>
        <span className="text-[8px] font-medium tracking-wider text-muted-foreground">
          NO EXPIRY
        </span>
      </div>
    </button>
  );
};

export default PackageCard;
