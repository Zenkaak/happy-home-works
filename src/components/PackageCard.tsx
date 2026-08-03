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
    className="relative flex h-full flex-col rounded-xl border-2 border-primary/35 bg-[linear-gradient(160deg,hsl(var(--primary)/0.14),hsl(var(--card)))] p-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-[0_10px_28px_-10px_hsl(var(--primary)/0.55)] group animate-slide-up overflow-hidden"
  >
    {product.is_promo && (
      <div className="absolute top-0 left-0 px-1.5 py-0.5 gradient-accent rounded-br-md shadow-[0_2px_10px_-2px_hsl(var(--accent)/0.7)] flex items-center gap-0.5">
        <Flame className="w-2.5 h-2.5 text-accent-foreground" />
        <span className="text-[8px] font-bold text-accent-foreground uppercase tracking-wider">Hot</span>
      </div>
    )}
    <ShareProductButton product={product} />

    <div className={`flex items-center gap-2 ${product.is_promo ? "mt-3" : ""} mb-2.5 pr-6`}>
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md gradient-primary shadow-[0_2px_10px_-3px_hsl(var(--primary)/0.7)] transition-colors">
        <Wifi className="w-3 h-3 text-primary-foreground" />
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

    <div className="mt-auto flex items-end justify-between gap-1 border-t border-primary/25 pt-2">
      <p className="font-display font-extrabold text-base text-primary leading-none">
        <span className="text-primary/80 text-[9px] mr-0.5 font-bold tracking-wide">KSH</span>
        {product.price}
      </p>
      <span className="text-[8px] text-muted-foreground font-medium tracking-wide uppercase leading-none">No expiry</span>
    </div>
  </button>
);

export default PackageCard;
