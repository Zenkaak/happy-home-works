import { useMemo } from "react";
import { FlaskConical } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PackageCard from "@/components/PackageCard";
import PackageCardSkeleton from "@/components/PackageCardSkeleton";
import { useProducts } from "@/hooks/useProducts";
import { useCheckout } from "@/contexts/CheckoutContext";
import type { Product } from "@/lib/types";

const TestPackages = () => {
  const { openCheckout } = useCheckout();
  const { data: products, isFetching, isError } = useProducts("test");

  const list = useMemo(() => products ?? [], [products]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pb-10 pt-4">
        <section className="px-4 mb-4">
          <div className="gradient-card rounded-2xl p-4 border border-primary/30 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center shrink-0">
              <FlaskConical className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display font-extrabold text-lg leading-tight">Test Packages</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sandbox packages for testing STK, receipts, and delivery flows.
              </p>
            </div>
          </div>
        </section>

        <div className="px-4 min-h-[300px]">
          {isFetching && list.length === 0 ? (
            <div className="grid grid-cols-2 gap-2.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <PackageCardSkeleton key={i} />
              ))}
            </div>
          ) : list.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-sm">
                {isError
                  ? "Failed to load test packages."
                  : "No test packages yet. Admin can create them in the Test tab."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {list.map((p: Product) => (
                <PackageCard key={p.id} product={p} onSelect={(prod) => openCheckout(prod)} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TestPackages;
