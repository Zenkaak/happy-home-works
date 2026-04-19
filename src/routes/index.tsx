import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import ServiceSelector from "@/components/ServiceSelector";
import NetworkTabs from "@/components/NetworkTabs";
import PackageCard from "@/components/PackageCard";
import KplcCard from "@/components/KplcCard";
import LoanCard from "@/components/LoanCard";
import ProductFilterBar from "@/components/ProductFilterBar";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import { fetchProducts, useProducts } from "@/hooks/useProducts";
import type { NetworkProvider, Product, ServiceCategory } from "@/lib/types";

const searchSchema = z.object({
  ref: z.string().optional(),
});

export const Route = createFileRoute("/")({
  validateSearch: searchSchema,
  component: Index,
});

function Index() {
  const queryClient = useQueryClient();
  const search = useSearch({ from: "/" });
  const navigate = useNavigate();
  const referralCode = search.ref;

  const [category, setCategory] = useState<ServiceCategory>("data");
  const [network, setNetwork] = useState<NetworkProvider>("safaricom");
  const [searchQuery, setSearchQuery] = useState("");
  const [priceRange, setPriceRange] = useState<[number, number] | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 30;

  // Prefetch all categories
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

  const filtered = useMemo(() => {
    let list = products ?? [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.data_amount && p.data_amount.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    }
    if (priceRange) {
      list = list.filter((p) => p.price >= priceRange[0] && p.price <= priceRange[1]);
    }
    if (category === "data") {
      const dataOnly = list.filter((p) => !p.minutes);
      const withMins = list.filter((p) => !!p.minutes);
      const out: Product[] = [];
      const max = Math.max(dataOnly.length, withMins.length);
      for (let i = 0; i < max; i++) {
        if (dataOnly[i]) out.push(dataOnly[i]);
        if (withMins[i]) out.push(withMins[i]);
      }
      return out;
    }
    return list;
  }, [products, searchQuery, priceRange, category]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  useEffect(() => {
    setPage(1);
  }, [searchQuery, priceRange, category, network]);

  const handleSelect = (p: Product) => {
    // Phase 2 will open checkout. For now navigate to order placeholder.
    navigate({
      to: "/order/$id",
      params: { id: "preview" },
      search: { product: p.id, ref: referralCode },
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div
        className={`fixed left-0 top-0 z-50 h-[2px] w-full transition-opacity duration-300 ${
          isFetching ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="h-full w-full animate-pulse bg-primary" />
      </div>

      <Header />
      <HeroSection />

      <main className="space-y-3 pb-8 pt-2">
        <div className="mx-auto max-w-2xl space-y-2 px-4">
          <AnnouncementBanner />

          <button
            type="button"
            onClick={() => navigate({ to: "/vendor" })}
            className="group relative w-full overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-r from-primary/15 via-accent/10 to-primary/15 p-3 transition-all hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10"
          >
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-primary/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/30 bg-primary/20">
                  <span className="text-base">💼</span>
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold leading-tight text-foreground">
                    Become a DASNET Vendor
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Earn 10% commission on every sale
                  </p>
                </div>
              </div>
              <span className="rounded-md border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                Apply →
              </span>
            </div>
          </button>
        </div>

        <ServiceSelector selected={category} onChange={setCategory} />

        {category === "data" && (
          <NetworkTabs selected={network} onChange={setNetwork} />
        )}

        <div className="mx-auto max-w-2xl px-4">
          <ProductFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            priceRange={priceRange}
            onPriceRangeChange={setPriceRange}
            totalCount={products?.length ?? 0}
            filteredCount={filtered.length}
          />
        </div>

        <div className="relative mx-auto min-h-[400px] max-w-2xl px-4">
          <div
            className={`grid grid-cols-2 gap-2.5 transition-opacity duration-300 ${
              isFetching ? "opacity-60" : "opacity-100"
            }`}
          >
            {paged.map((p) => {
              if (category === "data")
                return <PackageCard key={p.id} product={p} onSelect={handleSelect} />;
              if (category === "kplc")
                return <KplcCard key={p.id} product={p} onSelect={handleSelect} />;
              return <LoanCard key={p.id} product={p} onSelect={handleSelect} />;
            })}
          </div>

          {!isFetching && filtered.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-muted-foreground">
                {searchQuery || priceRange
                  ? "No packages match your filters"
                  : "No packages available"}
              </p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-border/50 bg-secondary px-3 py-2 text-xs font-semibold text-foreground transition-all disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-xs font-semibold text-muted-foreground">
                Page {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-border/50 bg-secondary px-3 py-2 text-xs font-semibold text-foreground transition-all disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
