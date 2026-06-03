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
import LiveTrustBar from "@/components/LiveTrustBar";
import RecentActivityTicker from "@/components/RecentActivityTicker";

import TestimonialsSection from "@/components/TestimonialsSection";

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

  // Debug log to check database structure vs state
  useEffect(() => {
    if (products && products.length > 0) {
      console.log("DB Keys check:", Object.keys(products[0]));
      console.log(`Loaded ${products.length} for ${category} - ${network}`);
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

    // FIXED: Changed 'provider' to 'network' to match your DB schema
    if (category === "data") {
      filtered = filtered.filter(
        (p) => p.network?.toLowerCase() === network.toLowerCase()
      );
    }

    // Interleaving logic for 2-column grid layout
    if (category === "data") {
      // Logic adjusted to handle "Enter your minutes" text or nulls
      const dataOnly = filtered.filter((p) => !p.minutes || p.minutes.includes("Enter"));
      const withMinutes = filtered.filter((p) => p.minutes && !p.minutes.includes("Enter"));
      
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

  useEffect(() => { 
    setPage(1); 
  }, [searchQuery, priceRange, category, network]);

  const handleCategoryChange = (cat: ServiceCategory) => {
    setCategory(cat);
  };

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <div className={`fixed top-0 left-0 w-full h-[2px] z-50 transition-opacity duration-300 ${isFetching ? "opacity-100" : "opacity-0"}`}>
        <div className="h-full bg-primary animate-pulse w-full" />
      </div>

      <Header />
      <TrustStrip />

      <main className="space-y-3 pb-8 pt-3">
        <LiveTrustBar />
        <RecentActivityTicker />


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

          {!isFetching && !isError && filteredProducts.length === 0 && (
            <div className="text-center py-20 animate-in fade-in zoom-in">
              <p className="text-muted-foreground text-sm">
                {searchQuery || priceRange ? "No packages match your filters" : "No packages available right now"}
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
      <TestimonialsSection />
      <Footer />
      <ChatButton />
    </div>
  );
};

export default Index;
