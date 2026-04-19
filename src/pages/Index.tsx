import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

import { fetchProducts, useProducts } from "@/hooks/useProducts";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ServiceSelector from "@/components/ServiceSelector";
import NetworkTabs from "@/components/NetworkTabs";
import PackageCard from "@/components/PackageCard";
import KplcCard from "@/components/KplcCard";
import LoanCard from "@/components/LoanCard";
import ChatButton from "@/components/ChatButton";
import { useCheckout } from "@/contexts/CheckoutContext";
import ProductFilterBar from "@/components/ProductFilterBar";
import VendorLeaderboard from "@/components/VendorLeaderboard";

import type { Product, ServiceCategory, NetworkProvider } from "@/lib/types";

const Index = () => {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const referralCode = searchParams.get("ref") || undefined;
  const { openCheckout } = useCheckout();
  const [category, setCategory] = useState<ServiceCategory>("data");
  const [network, setNetwork] = useState<NetworkProvider>("safaricom");
  const [searchQuery, setSearchQuery] = useState("");
  const [priceRange, setPriceRange] = useState<[number, number] | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 30;

  // Prefetch all categories on mount for instant switching
  useEffect(() => {
    const cats: { cat: ServiceCategory; net?: NetworkProvider }[] = [
      { cat: "data", net: "safaricom" },
      { cat: "data", net: "airtel" },
      { cat: "data", net: "telkom" },
      { cat: "kplc" },
      { cat: "loans" },
    ];
    cats.forEach(({ cat, net }) => {
      queryClient.prefetchQuery({
        queryKey: ["products", cat, net],
        queryFn: () => fetchProducts(cat, net),
      });
    });
  }, [queryClient]);

  const { data: products, isFetching } = useProducts(
    category,
    category === "data" ? network : undefined
  );

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    let filtered = products;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.data_amount && p.data_amount.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    }
    if (priceRange) {
      filtered = filtered.filter(
        (p) => p.price >= priceRange[0] && p.price <= priceRange[1]
      );
    }

    // For data: split data-only (left) vs data+minutes (right) and interleave
    // so the 2-column grid shows data-only on left, voice combos on right.
    if (category === "data") {
      const dataOnly = filtered.filter((p) => !p.minutes);
      const withMinutes = filtered.filter((p) => !!p.minutes);
      const interleaved: typeof filtered = [];
      const max = Math.max(dataOnly.length, withMinutes.length);
      for (let i = 0; i < max; i++) {
        if (dataOnly[i]) interleaved.push(dataOnly[i]);
        if (withMinutes[i]) interleaved.push(withMinutes[i]);
      }
      return interleaved;
    }

    return filtered;
  }, [products, searchQuery, priceRange, category]);

  const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE);
  const paginatedProducts = useMemo(
    () => filteredProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredProducts, page]
  );

  useEffect(() => { setPage(1); }, [searchQuery, priceRange, category, network]);

  const handleCategoryChange = (cat: ServiceCategory) => {
    setCategory(cat);
  };

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">

      <div className={`fixed top-0 left-0 w-full h-[2px] z-50 transition-opacity duration-300 ${isFetching ? "opacity-100" : "opacity-0"}`}>
        <div className="h-full bg-primary animate-pulse w-full" />
      </div>

      <Header />

      <main className="space-y-3 pb-8 pt-4">
        <div className="px-4 space-y-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
            <span className="text-xs">🔥</span>
            <p className="text-[11px] text-primary font-medium">
              Cheapest data bundles in Kenya — instant delivery, 24/7!
            </p>
          </div>
          <button
            onClick={() => navigate("/vendor")}
            className="group w-full relative overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-r from-primary/15 via-accent/10 to-primary/15 p-3 hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10 transition-all"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <span className="text-base">💼</span>
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-foreground leading-tight">Become a DASNET Vendor</p>
                  <p className="text-[10px] text-muted-foreground">Earn 10% commission on every sale</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider px-2 py-1 rounded-md bg-primary/10 border border-primary/20">
                Apply →
              </span>
            </div>
          </button>
        </div>

        <ServiceSelector selected={category} onChange={handleCategoryChange} />

        {category === "data" && (
          <NetworkTabs
            selected={network}
            onChange={(net) => setNetwork(net)}
          />
        )}

        <div className="px-4">
          <ProductFilterBar
            searchQuery={searchQuery}
            onSearchChange={(q) => setSearchQuery(q)}
            priceRange={priceRange}
            onPriceRangeChange={(r) => setPriceRange(r)}
            totalCount={products?.length ?? 0}
            filteredCount={filteredProducts.length}
          />
        </div>

        <div className="px-4 relative min-h-[400px]">
          <div className={`grid grid-cols-2 gap-2.5 transition-all duration-300 ${isFetching ? "opacity-60" : "opacity-100"}`}>
            {paginatedProducts.map((p) => {
              const handleSelect = (prod: Product) => {
                if (prod.category === "data") {
                  setUpsellProduct(prod);
                } else {
                  setSelectedProduct(prod);
                  setShowCheckout(true);
                }
              };
              if (category === "data") return <PackageCard key={p.id} product={p} onSelect={handleSelect} />;
              if (category === "kplc") return <KplcCard key={p.id} product={p} onSelect={handleSelect} />;
              return <LoanCard key={p.id} product={p} onSelect={handleSelect} />;
            })}
          </div>

          {!isFetching && filteredProducts.length === 0 && (
            <div className="text-center py-20 animate-in fade-in zoom-in">
              <p className="text-muted-foreground">
                {searchQuery || priceRange ? "No packages match your filters" : "No packages available"}
              </p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-2 rounded-lg text-xs font-semibold bg-secondary border border-border/50 text-foreground disabled:opacity-40 transition-all"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 7) pageNum = i + 1;
                  else if (page <= 4) pageNum = i + 1;
                  else if (page >= totalPages - 3) pageNum = totalPages - 6 + i;
                  else pageNum = page - 3 + i;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                        page === pageNum
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-secondary/60 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-2 rounded-lg text-xs font-semibold bg-secondary border border-border/50 text-foreground disabled:opacity-40 transition-all"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </main>

      <VendorLeaderboard />

      <Footer />
      <ChatButton />
    </div>

      <Footer />
      <ChatButton />
    </div>
  );
};

export default Index;
