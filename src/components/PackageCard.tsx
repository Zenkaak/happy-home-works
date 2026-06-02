import { Wifi, Flame, Phone } from "lucide-react";
import type { Product } from "@/lib/types";
import ShareProductButton from "@/components/ShareProductButton";

interface PackageCardProps {
  product: Product;
  onSelect: (p: Product) => void;
}

const PackageCard = ({ product, onSelect }: PackageCardProps) => (
  <button
    onClick={() => onSelect(product)}
    className="relative gradient-card rounded-xl p-3 text-left transition-all hover:border-primary/40 hover:shadow-[0_8px_24px_-12px_hsl(var(--primary)/0.4)] hover:-translate-y-0.5 group animate-slide-up overflow-hidden"
  >
    {product.is_promo && (
      <div className="absolute top-0 right-0 px-1.5 py-0.5 bg-accent/90 rounded-bl-md flex items-center gap-0.5">
        <Flame className="w-2.5 h-2.5 text-accent-foreground" />
        <span className="text-[8px] font-bold text-accent-foreground uppercase tracking-wider">Hot</span>
      </div>
    )}

    <div className="flex items-center gap-1.5 mb-2">
      <div className="fire-icon fire-square w-6 h-6 bg-primary/10 border border-primary/20 shrink-0 group-hover:bg-primary/20 transition-colors">
        <Wifi className="w-3 h-3 text-primary" />
      </div>
      <h3 className="font-display font-bold text-[12px] text-foreground truncate flex-1">{product.name}</h3>
    </div>

    {product.minutes && (
      <div className="flex items-center gap-1 mb-1.5">
        <Phone className="w-2.5 h-2.5 text-muted-foreground" />
        <span className="text-[9px] text-muted-foreground font-medium">+ {product.minutes} mins</span>
      </div>
    )}

    <div className="flex items-end justify-between gap-1">
      <p className="font-display font-extrabold text-base text-foreground leading-none">
        <span className="text-primary text-[9px] mr-0.5 font-bold">KSH</span>{product.price}
      </p>
      <span className="text-[8px] text-muted-foreground font-semibold tracking-wider uppercase leading-none">No expiry</span>
    </div>
  </button>
);

export default PackageCard;
