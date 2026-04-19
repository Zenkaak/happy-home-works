import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";

interface ProductFilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  priceRange: [number, number] | null;
  onPriceRangeChange: (range: [number, number] | null) => void;
  totalCount: number;
  filteredCount: number;
}

const priceRanges: { label: string; range: [number, number] }[] = [
  { label: "Under 100", range: [0, 99] },
  { label: "100–300", range: [100, 300] },
  { label: "300–600", range: [300, 600] },
  { label: "600+", range: [600, 99999] },
];

const ProductFilterBar = ({
  searchQuery,
  onSearchChange,
  priceRange,
  onPriceRangeChange,
  totalCount,
  filteredCount,
}: ProductFilterBarProps) => {
  const [showFilters, setShowFilters] = useState(false);
  const hasActiveFilters = searchQuery.length > 0 || priceRange !== null;

  return (
    <div className="space-y-2">
      {/* Search bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search packages (e.g. 20GB, unlimited)..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-secondary/60 border border-border/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`p-2.5 rounded-xl border transition-all shrink-0 ${
            showFilters || priceRange
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-secondary/60 border-border/50 text-muted-foreground hover:text-foreground"
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Price filter chips */}
      {showFilters && (
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none animate-in fade-in slide-in-from-top-2 duration-200">
          <span className="text-[10px] text-muted-foreground font-medium shrink-0 mr-1">PRICE:</span>
          {priceRanges.map((pr) => {
            const active = priceRange?.[0] === pr.range[0] && priceRange?.[1] === pr.range[1];
            return (
              <button
                key={pr.label}
                onClick={() => onPriceRangeChange(active ? null : pr.range)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all shrink-0 ${
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary/60 border border-border/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                KSH {pr.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Active filter summary */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground">
            Showing {filteredCount} of {totalCount} packages
          </p>
          <button
            onClick={() => {
              onSearchChange("");
              onPriceRangeChange(null);
            }}
            className="text-[10px] text-primary font-semibold hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductFilterBar;
