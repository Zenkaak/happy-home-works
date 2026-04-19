import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import type { Product } from "@/lib/types";
import { fetchProducts } from "@/hooks/useProducts";
import { useQuery } from "@tanstack/react-query";
import CheckoutModal from "@/components/CheckoutModal";
import UpsellModal from "@/components/UpsellModal";

interface CheckoutContextValue {
  openCheckout: (product: Product, opts?: { skipUpsell?: boolean }) => void;
  closeCheckout: () => void;
}

const CheckoutContext = createContext<CheckoutContextValue | null>(null);

export const useCheckout = () => {
  const ctx = useContext(CheckoutContext);
  if (!ctx) throw new Error("useCheckout must be used within CheckoutProvider");
  return ctx;
};

export const CheckoutProvider = ({ children }: { children: ReactNode }) => {
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get("ref") || undefined;

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [upsellProduct, setUpsellProduct] = useState<Product | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);

  // Fetch siblings for upsell suggestions when needed
  const { data: networkProducts } = useQuery({
    queryKey: ["products", "data", upsellProduct?.network],
    queryFn: () => fetchProducts("data", upsellProduct?.network as any),
    enabled: !!upsellProduct && upsellProduct.category === "data" && !!upsellProduct.network,
  });

  const openCheckout = useCallback((product: Product, opts?: { skipUpsell?: boolean }) => {
    if (!opts?.skipUpsell && product.category === "data" && product.data_amount && product.network) {
      setUpsellProduct(product);
      setShowCheckout(false);
      setSelectedProduct(null);
    } else {
      setSelectedProduct(product);
      setShowCheckout(true);
      setUpsellProduct(null);
    }
  }, []);

  const closeCheckout = useCallback(() => {
    setSelectedProduct(null);
    setShowCheckout(false);
    setUpsellProduct(null);
  }, []);

  return (
    <CheckoutContext.Provider value={{ openCheckout, closeCheckout }}>
      {children}

      {upsellProduct && !showCheckout && (
        <UpsellModal
          selectedProduct={upsellProduct}
          allProducts={networkProducts || []}
          onProceedOriginal={() => {
            setSelectedProduct(upsellProduct);
            setUpsellProduct(null);
            setShowCheckout(true);
          }}
          onProceedUpsell={(p) => {
            setSelectedProduct(p);
            setUpsellProduct(null);
            setShowCheckout(true);
          }}
          onClose={() => setUpsellProduct(null)}
        />
      )}

      {showCheckout && selectedProduct && (
        <CheckoutModal
          product={selectedProduct}
          referralCode={referralCode}
          onClose={closeCheckout}
        />
      )}
    </CheckoutContext.Provider>
  );
};
