import { useState, useEffect, useMemo } from "react";
import type { Product } from "@/lib/types";
import { ArrowRight, Sparkles, X, TrendingUp } from "lucide-react";

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

  const pricePerGbOriginal = (selectedProduct.price / selectedGB).toFixed(1);
  const pricePerGbUpgrade = (upsellProduct.price / upsGB).toFixed(1);
  const savingsPct = Math.round(
    ((Number(pricePerGbOriginal) - Number(pricePerGbUpgrade)) / Number(pricePerGbOriginal)) * 100
  );

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-card rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl border border-border/60 animate-in slide-in-from-bottom-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-5 pt-5 pb-4 border-b border-border/60">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-secondary/80 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-[10px] uppercase tracking-[0.15em] text-primary font-bold">
              Smart Upgrade
            </span>
          </div>
          <h3 className="font-display font-bold text-lg text-foreground leading-tight">
            Better value awaits
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pay just KES {extraPrice} more — get {extraData}GB extra
          </p>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          {/* CURRENT PLAN */}
          <div className="rounded-2xl border border-border/60 p-4 bg-muted/20">
            <div className="flex justify-between items-center mb-2.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Your selection
              </p>
              <span className="text-[9px] uppercase tracking-wider font-bold bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                Current
              </span>
            </div>

            <div className="flex justify-between items-end">
              <div>
                <p className="font-display font-bold text-base text-foreground">
                  {selectedProduct.data_amount}
                </p>
                {selectedProduct.minutes && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {selectedProduct.minutes}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground mt-1">
                  KES {pricePerGbOriginal}/GB
                </p>
              </div>

              <div className="font-display font-bold text-foreground text-lg leading-none">
                <span className="text-[10px] text-muted-foreground font-medium mr-0.5">
                  KES
                </span>
                {selectedProduct.price}
              </div>
            </div>

            <button
              onClick={onProceedOriginal}
              className="w-full mt-3.5 rounded-xl py-2.5 text-xs border border-border/60 font-semibold text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
            >
              Keep current plan
            </button>
          </div>

          {/* UPGRADE PLAN */}
          <div className="relative rounded-2xl border-2 border-primary/40 p-4 bg-gradient-to-br from-primary/8 via-card to-card overflow-hidden">
            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-primary/10 blur-2xl" />

            <div className="relative">
              <div className="flex justify-between items-center mb-2.5">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-primary" />
                  <p className="text-xs font-bold text-primary uppercase tracking-wider">
                    Recommended
                  </p>
                </div>
                {savingsPct > 0 && (
                  <span className="text-[9px] uppercase tracking-wider font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full shadow-sm">
                    Save {savingsPct}%/GB
                  </span>
                )}
              </div>

              <div className="flex justify-between items-end">
                <div>
                  <p className="font-display font-bold text-lg text-foreground">
                    {upsellProduct.data_amount}
                  </p>
                  {upsellProduct.minutes && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {upsellProduct.minutes}
                    </p>
                  )}
                  <p className="text-[10px] text-primary font-semibold mt-1">
                    KES {pricePerGbUpgrade}/GB
                  </p>
                </div>

                <div className="font-display font-extrabold text-primary text-xl leading-none">
                  <span className="text-[10px] font-medium mr-0.5 opacity-80">
                    KES
                  </span>
                  {upsellProduct.price}
                </div>
              </div>

              <div className="mt-3 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-[11px] text-foreground/80 leading-snug text-center">
                  <span className="font-bold text-primary">+{extraData}GB</span> for only{" "}
                  <span className="font-bold text-primary">KES {extraPrice}</span> more
                </p>
              </div>

              <button
                onClick={() => onProceedUpsell(upsellProduct)}
                className="w-full mt-3.5 rounded-xl py-3 text-sm gradient-primary text-primary-foreground font-display font-bold flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.99] transition-all shadow-lg shadow-primary/25"
              >
                Upgrade Now <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpsellModal;
