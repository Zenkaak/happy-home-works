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
import TrustStrip from "@/components/TrustStrip";
import PackageCardSkeleton from "@/components/PackageCardSkeleton";

import type { Product, ServiceCategory, NetworkProvider } from "@/lib/types";

const Index = () => {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const referralCode = searchParams.get("ref") || undefined;
  const { openCheckout } = useCheckout();
  
  // State management
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

  // Data Fetching
  const { data: products, isFetching, isError } = useProducts(
    category,
    category === "data" ? network : undefined
  );

  // Debug log to catch data mismatches in console
  useEffect(() => {
    if (products) {
      console.log(`Loaded ${products.length} products for ${category} - ${network}`);
    }
  }, [products, category, network]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    let filtered = [...products];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.data_amount && p.data_amount.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    }

    // Price range filter
    if (priceRange) {
      filtered = filtered.filter(
        (p) => p.price >= priceRange[0] && p.price <= priceRange[1]
      );
    }

    // Provider check (Extra safety layer for "No packages" issue)
    if (category === "data") {
      filtered = filtered.filter(
        (p) => p.provider?.toLowerCase() === network.toLowerCase()
      );
    }

    // Interleaving logic for 2-column grid layout
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
  }, [products, searchQuery, priceRange, category, network]);

  const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE);
  const paginatedProducts = useMemo(
    () => filteredProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredProducts, page]
  );

  // Reset to first page when filters change
  useEffect(() => { 
    setPage(1); 
  }, [searchQuery, priceRange, category, network]);

  const handleCategoryChange = (cat: ServiceCategory) => {
    setCategory(cat);
  };

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Top Loading Bar */}
      <div className={`fixed top-0 left-0 w-full h-[2px] z-50 transition-opacity duration-300 ${isFetching ? "opacity-100" : "opacity-0"}`}>
        <div className="h-full bg-primary animate-pulse w-full" />
      </div>

      <Header />
      <TrustStrip />

      <main className="space-y-3 pb-8 pt-3">
        <div className="px-4 space-y-2">
          {/* Promo strip */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 backdrop-blur-sm">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
            </span>
            <p className="text-[11px] text-primary font-semibold tracking-wide">
              Cheapest data bundles in Kenya — instant delivery, 24/7
            </p>
          </div>

          {/* Vendor CTA */}
          <button
            onClick={() => navigate("/vendor")}
            className="group w-full relative overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-r from-primary/15 via-accent/5 to-primary/15 p-3 hover:border-primary/60 hover:shadow-[0_8px_24px_-12px_hsl(var(--primary)/0.4)] transition-all"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center shadow-sm shadow-primary/20">
                  <span className="text-base">💼</span>
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-foreground leading-tight">Become a DASNET Vendor</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Earn 10% commission on every sale</p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-primary uppercase tracking-[0.12em] px-2.5 py-1.5 rounded-md bg-primary/10 border border-primary/20 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
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
          {/* Skeleton state during initial load */}
          {isFetching && (!products || products.length === 0) ? (
            <div className="grid grid-cols-2 gap-2.5">
              {Array.from({ length: 8 }).map((_, i) => (
                <PackageCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className={`grid grid-cols-2 gap-2.5 transition-all duration-300 ${isFetching ? "opacity-60" : "opacity-100"}`}>
              {paginatedProducts.map((p) => {
                const handleSelect = (prod: Product) => openCheckout(prod);
                if (category === "data") return <PackageCard key={p.id} product={p} onSelect={handleSelect} />;
                if (category === "kplc") return <KplcCard key={p.id} product={p} onSelect={handleSelect} />;
                return <LoanCard key={p.id} product={p} onSelect={handleSelect} />;
              })}
            </div>
          )}

          {/* Error State */}
          {isError && (
            <div className="text-center py-20">
              <p className="text-red-400 text-sm font-medium">Failed to load packages. Please check your connection.</p>
              <button 
                onClick={() => queryClient.invalidateQueries({ queryKey: ["products"] })}
                className="mt-4 text-xs text-primary underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty State */}
          {!isFetching && !isError && filteredProducts.length === 0 && (
            <div className="text-center py-20 animate-in fade-in zoom-in">
              <p className="text-muted-foreground text-sm">
                {searchQuery || priceRange ? "No packages match your filters" : "No packages available right now"}
              </p>
            </div>
          )}

          {/* Pagination */}
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
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) pageNum = i + 1;
                  else if (page <= 3) pageNum = i + 1;
                  else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else pageNum = page - 2 + i;
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
  );
};

export default Index;
