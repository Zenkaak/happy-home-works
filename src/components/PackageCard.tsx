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
    className="relative flex h-full flex-col rounded-xl border border-border bg-card p-3 text-left transition-all hover:border-primary/40 hover:shadow-[0_6px_20px_-12px_hsl(var(--primary)/0.35)] group animate-slide-up overflow-hidden"
  >
    {product.is_promo && (
      <div className="absolute top-0 left-0 px-1.5 py-0.5 bg-accent rounded-br-md flex items-center gap-0.5">
        <Flame className="w-2.5 h-2.5 text-accent-foreground" />
        <span className="text-[8px] font-bold text-accent-foreground uppercase tracking-wider">Hot</span>
      </div>
    )}
    <ShareProductButton product={product} />

    <div className={`flex items-center gap-2 ${product.is_promo ? "mt-3" : ""} mb-2.5 pr-6`}>
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 border border-primary/20 group-hover:bg-primary/20 transition-colors">
        <Wifi className="w-3 h-3 text-primary" />
      </div>
      <h3 className="font-display font-semibold text-[12px] text-foreground truncate flex-1">{product.name}</h3>
    </div>

    <div className="mb-2 flex h-3 items-center gap-1">
      {product.minutes && (
        <>
          <Phone className="w-2.5 h-2.5 text-muted-foreground" />
          <span className="text-[9px] text-muted-foreground font-medium">+ {product.minutes} mins</span>
        </>
      )}
    </div>

    <div className="mt-auto flex items-end justify-between gap-1 border-t border-border/60 pt-2">
      <p className="font-display font-bold text-base text-foreground leading-none">
        <span className="text-muted-foreground text-[9px] mr-0.5 font-semibold tracking-wide">KSH</span>
        {product.price}
      </p>
      <span className="text-[8px] text-muted-foreground font-medium tracking-wide uppercase leading-none">No expiry</span>
    </div>
  </button>
);

export default PackageCard;
