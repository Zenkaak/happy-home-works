import { useState, useEffect } from "react";
import type { Product } from "@/lib/types";
import { ArrowRight, Check, TrendingUp } from "lucide-react";

interface UpsellModalProps {
  selectedProduct: Product;
  allProducts: Product[];
  onProceedOriginal: () => void;
  onProceedUpsell: (product: Product) => void;
  onClose: () => void;
}

const UpsellModal = ({
  selectedProduct,
  allProducts,
  onProceedOriginal,
  onProceedUpsell,
  onClose,
}: UpsellModalProps) => {
  const [upsellProduct, setUpsellProduct] = useState<Product | null>(null);

  useEffect(() => {
    if (selectedProduct.category !== "data" || !selectedProduct.data_amount) return;

    const selectedGB = parseFloat(
      selectedProduct.data_amount.replace(/[^0-9.]/g, "")
    );
    if (isNaN(selectedGB)) return;

    const sameNetworkProducts = allProducts
      .filter(
        (p) =>
          p.network === selectedProduct.network &&
          p.category === "data" &&
          p.is_visible
      )
      .sort((a, b) => {
        const aGB = parseFloat((a.data_amount || "0").replace(/[^0-9.]/g, ""));
        const bGB = parseFloat((b.data_amount || "0").replace(/[^0-9.]/g, ""));
        return aGB - bGB;
      });

    const candidate = sameNetworkProducts.find((p) => {
      const pGB = parseFloat((p.data_amount || "0").replace(/[^0-9.]/g, ""));
      const gbDiff = pGB - selectedGB;
      const priceDiff = p.price - selectedProduct.price;

      return (
        pGB > selectedGB &&
        gbDiff > 0 &&
        priceDiff > 0 &&
        priceDiff / gbDiff <= 30
      );
    });

    if (candidate) {
      setUpsellProduct(candidate);
    }
  }, [selectedProduct, allProducts]);

  if (!upsellProduct) return null;

  const savings = upsellProduct.price - selectedProduct.price;

  const selectedGB = parseFloat(
    selectedProduct.data_amount?.replace(/[^0-9.]/g, "") || "0"
  );
  const upsGB = parseFloat(
    upsellProduct.data_amount?.replace(/[^0-9.]/g, "") || "0"
  );
  const extraData = upsGB - selectedGB;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-card rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 text-center border-b">
          <h3 className="font-semibold text-base">Upgrade Your Plan</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Get more value for less
          </p>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* CURRENT PLAN */}
          <div className="rounded-xl border p-4 bg-muted/30">
            <div className="flex justify-between items-start mb-3">
              <p className="text-sm font-medium">Current Plan</p>
              <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
                Selected
              </span>
            </div>

            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                {selectedProduct.data_amount}
                {selectedProduct.minutes && (
                  <div className="text-xs mt-1">
                    {selectedProduct.minutes}
                  </div>
                )}
              </div>

              <div className="font-semibold">
                KES {selectedProduct.price}
              </div>
            </div>

            <button
              onClick={onProceedOriginal}
              className="w-full mt-4 rounded-lg py-2.5 text-sm border font-medium hover:bg-muted transition"
            >
              Continue
            </button>
          </div>

          {/* UPGRADE PLAN */}
          <div className="rounded-xl border border-primary/40 p-4 bg-primary/5 relative">
            <div className="absolute top-3 right-3 text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
              Recommended
            </div>

            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium">Upgrade Plan</p>
            </div>

            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                {upsellProduct.data_amount}
                {upsellProduct.minutes && (
                  <div className="text-xs mt-1">
                    {upsellProduct.minutes}
                  </div>
                )}
              </div>

              <div className="font-semibold text-primary">
                KES {upsellProduct.price}
              </div>
            </div>

            <div className="text-xs text-muted-foreground mt-2">
              <span className="font-medium text-foreground">
                +{extraData}GB
              </span>{" "}
              for only{" "}
              <span className="font-medium text-primary">
                KES {savings}
              </span>
            </div>

            <button
              onClick={() => onProceedUpsell(upsellProduct)}
              className="w-full mt-4 rounded-lg py-2.5 text-sm bg-primary text-primary-foreground font-medium flex items-center justify-center gap-2 hover:opacity-90 transition"
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
