import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import type { Product } from "@/lib/types";
import CheckoutModal from "@/components/CheckoutModal";
import { supabase } from "@/integrations/supabase/client";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const referralCode = searchParams.get("ref") || undefined;
  const productParam = searchParams.get("product");

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);

  const openCheckout = useCallback((product: Product) => {
    setSelectedProduct(product);
    setShowCheckout(true);
  }, []);

  const closeCheckout = useCallback(() => {
    setSelectedProduct(null);
    setShowCheckout(false);
    // Clear ?product= from URL so it doesn't reopen
    if (searchParams.get("product")) {
      const next = new URLSearchParams(searchParams);
      next.delete("product");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Deep link: ?product=<id> opens checkout directly
  useEffect(() => {
    if (!productParam || showCheckout) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", productParam)
        .maybeSingle();
      if (cancelled || error || !data) return;
      setSelectedProduct(data as Product);
      setShowCheckout(true);
    })();
    return () => { cancelled = true; };
  }, [productParam, showCheckout]);

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
