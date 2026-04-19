import { Search, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";

interface ProductFilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  priceRange: [number, number] | null;
  onPriceRangeChange: (r: [number, number] | null) => void;
  totalCount: number;
  filteredCount: number;
}

const PRESETS: { label: string; range: [number, number] }[] = [
  { label: "Under 100", range: [0, 99] },
  { label: "100-300", range: [100, 300] },
  { label: "300-600", range: [300, 600] },
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
  const hasFilters = searchQuery.length > 0 || priceRange !== null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search packages…"
            className="h-10 w-full rounded-xl border border-border/60 bg-secondary/60 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowFilters((s) => !s)}
          className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all ${
            showFilters || priceRange
              ? "border-primary/50 bg-primary/10 text-primary"
              : "border-border/60 bg-secondary/60 text-muted-foreground hover:text-foreground"
          }`}
          aria-label="Filters"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-1.5 rounded-xl border border-border/50 bg-card p-2">
          {PRESETS.map((p) => {
            const active =
              priceRange?.[0] === p.range[0] && priceRange?.[1] === p.range[1];
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => onPriceRangeChange(active ? null : p.range)}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          Showing <span className="font-semibold text-foreground">{filteredCount}</span>
          {hasFilters && ` of ${totalCount}`} packages
        </span>
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              onSearchChange("");
              onPriceRangeChange(null);
            }}
            className="font-semibold text-primary hover:underline"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
};

export default ProductFilterBar;
