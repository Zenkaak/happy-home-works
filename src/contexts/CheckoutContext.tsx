import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import type { Product } from "@/lib/types";
import CheckoutModal from "@/components/CheckoutModal";

interface CheckoutContextValue {
  openCheckout: (product: Product) => void;
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
  const [showCheckout, setShowCheckout] = useState(false);

  const openCheckout = useCallback((product: Product) => {
    setSelectedProduct(product);
    setShowCheckout(true);
  }, []);

  const closeCheckout = useCallback(() => {
    setSelectedProduct(null);
    setShowCheckout(false);
  }, []);

  return (
    <CheckoutContext.Provider value={{ openCheckout, closeCheckout }}>
      {children}

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
