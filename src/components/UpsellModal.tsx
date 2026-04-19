import { useState, useEffect, useMemo } from "react";
import type { Product } from "@/lib/types";
import { ArrowRight, Sparkles, TrendingUp, X, Check, Zap } from "lucide-react";

interface UpsellModalProps {
  selectedProduct: Product;
  allProducts: Product[];
  onProceedOriginal: () => void;
  onProceedUpsell: (product: Product) => void;
  onClose: () => void;
}

const parseGB = (s?: string | null) =>
  s ? parseFloat(s.replace(/[^0-9.]/g, "")) : NaN;

const UpsellModal = ({
  selectedProduct,
  allProducts,
  onProceedOriginal,
  onProceedUpsell,
  onClose,
}: UpsellModalProps) => {
  const [upsellProduct, setUpsellProduct] = useState<Product | null>(null);

  const candidate = useMemo(() => {
    if (selectedProduct.category !== "data" || !selectedProduct.data_amount) return null;
    const selectedGB = parseGB(selectedProduct.data_amount);
    if (isNaN(selectedGB)) return null;

    const sameNetwork = allProducts
      .filter(
        (p) =>
          p.network === selectedProduct.network &&
          p.category === "data" &&
          p.is_visible &&
          p.id !== selectedProduct.id
      )
      .map((p) => ({ p, gb: parseGB(p.data_amount) }))
      .filter(({ gb }) => !isNaN(gb))
      .sort((a, b) => a.gb - b.gb);

    return (
      sameNetwork.find(({ p, gb }) => {
        const gbDiff = gb - selectedGB;
        const priceDiff = p.price - selectedProduct.price;
        return gb > selectedGB && priceDiff > 0 && priceDiff / gbDiff <= 30;
      })?.p || null
    );
  }, [selectedProduct, allProducts]);

  useEffect(() => {
    if (candidate) setUpsellProduct(candidate);
    else onProceedOriginal();
  }, [candidate]);

  if (!upsellProduct) return null;

  const extraPrice = upsellProduct.price - selectedProduct.price;
  const selectedGB = parseGB(selectedProduct.data_amount) || 0;
  const upsGB = parseGB(upsellProduct.data_amount) || 0;
  const extraData = +(upsGB - selectedGB).toFixed(1);
  const pricePerGB = +(extraPrice / extraData).toFixed(1);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-background/85 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-card border border-border/60 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl shadow-black/40 animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 gradient-primary opacity-10" />
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative flex items-start justify-between px-5 pt-5 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <span className="text-[10px] uppercase tracking-[0.15em] text-primary font-bold">
                  Smart Upgrade
                </span>
              </div>
              <h2 className="font-display text-xl font-bold text-foreground leading-tight">
                Better deal available 🎯
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Get more data for just KES {extraPrice} extra
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-secondary/80 transition-colors -mr-1 -mt-1"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="px-5 pb-5 space-y-3">
          {/* Recommended upgrade — top */}
          <div className="relative overflow-hidden rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/10 via-card to-card p-4">
            <div className="absolute top-3 right-3 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-primary text-primary-foreground px-2 py-1 rounded-full shadow-sm">
              <Zap className="w-3 h-3" /> Best Value
            </div>

            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-primary" />
              <p className="text-[10px] uppercase tracking-[0.15em] text-primary font-bold">
                Recommended
              </p>
            </div>

            <div className="flex items-end justify-between mb-3">
              <div>
                <p className="font-display font-bold text-lg text-foreground leading-tight">
                  {upsellProduct.data_amount}
                </p>
                {upsellProduct.minutes && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    + {upsellProduct.minutes}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</p>
                <p className="font-display text-2xl font-extrabold text-foreground leading-none">
                  <span className="text-xs text-muted-foreground font-medium">KSH</span>{" "}
                  {upsellProduct.price}
                </p>
              </div>
            </div>

            <div className="space-y-1.5 mb-4">
              <div className="flex items-center gap-2 text-xs">
                <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-foreground/90">
                  <span className="font-bold text-primary">+{extraData}GB</span> extra data
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-foreground/90">
                  Only <span className="font-bold">KES {pricePerGB}/GB</span> for the upgrade
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-foreground/90">Same instant delivery</span>
              </div>
            </div>

            <button
              onClick={() => onProceedUpsell(upsellProduct)}
              className="w-full rounded-xl py-3 text-sm gradient-primary text-primary-foreground font-bold flex items-center justify-center gap-2 hover:opacity-90 transition shadow-lg shadow-primary/20"
            >
              Upgrade for KES {extraPrice} more <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Original — secondary */}
          <button
            onClick={onProceedOriginal}
            className="w-full rounded-xl border border-border/60 bg-secondary/30 hover:bg-secondary/60 transition px-4 py-3 text-left flex items-center justify-between group"
          >
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                Or continue with
              </p>
              <p className="text-sm font-medium text-foreground">
                {selectedProduct.data_amount} — KES {selectedProduct.price}
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpsellModal;
