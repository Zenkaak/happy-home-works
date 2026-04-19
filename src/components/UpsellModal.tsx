import { useState, useEffect, useMemo } from "react";
import type { Product } from "@/lib/types";
import { ArrowRight, TrendingUp, X } from "lucide-react";

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate]);

  if (!upsellProduct) return null;

  const extraPrice = upsellProduct.price - selectedProduct.price;
  const selectedGB = parseGB(selectedProduct.data_amount) || 0;
  const upsGB = parseGB(upsellProduct.data_amount) || 0;
  const extraData = +(upsGB - selectedGB).toFixed(1);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-card rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl border border-border/60 animate-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 text-center border-b border-border/60 relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-secondary/80 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
          <h3 className="font-display font-bold text-base text-foreground">
            Upgrade Your Plan
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Get more value for less
          </p>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          {/* CURRENT PLAN */}
          <div className="rounded-xl border border-border/60 p-4 bg-muted/20">
            <div className="flex justify-between items-start mb-3">
              <p className="text-sm font-semibold text-foreground">Current Plan</p>
              <span className="text-[10px] uppercase tracking-wider font-semibold bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                Selected
              </span>
            </div>

            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {selectedProduct.data_amount}
                </span>
                {selectedProduct.minutes && (
                  <div className="text-xs mt-1">{selectedProduct.minutes}</div>
                )}
              </div>

              <div className="font-display font-bold text-foreground">
                <span className="text-[10px] text-muted-foreground font-medium mr-0.5">
                  KES
                </span>
                {selectedProduct.price}
              </div>
            </div>

            <button
              onClick={onProceedOriginal}
              className="w-full mt-4 rounded-lg py-2.5 text-sm border border-border/60 font-semibold hover:bg-muted/50 transition-colors"
            >
              Continue
            </button>
          </div>

          {/* UPGRADE PLAN */}
          <div className="rounded-xl border border-primary/40 p-4 bg-primary/5 relative">
            <div className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-wider bg-primary text-primary-foreground px-2 py-0.5 rounded-full shadow-sm">
              Recommended
            </div>

            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Upgrade Plan</p>
            </div>

            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {upsellProduct.data_amount}
                </span>
                {upsellProduct.minutes && (
                  <div className="text-xs mt-1">{upsellProduct.minutes}</div>
                )}
              </div>

              <div className="font-display font-bold text-primary">
                <span className="text-[10px] font-medium mr-0.5 opacity-80">
                  KES
                </span>
                {upsellProduct.price}
              </div>
            </div>

            <div className="text-xs text-muted-foreground mt-2.5">
              <span className="font-semibold text-foreground">
                +{extraData}GB
              </span>{" "}
              for only{" "}
              <span className="font-semibold text-primary">
                KES {extraPrice}
              </span>{" "}
              more
            </div>

            <button
              onClick={() => onProceedUpsell(upsellProduct)}
              className="w-full mt-4 rounded-lg py-2.5 text-sm gradient-primary text-primary-foreground font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-md shadow-primary/20"
            >
              Upgrade <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpsellModal;
