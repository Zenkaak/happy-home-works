import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/lib/types";

const CACHE_TTL_MS = 1000 * 60 * 30;

const getCacheKey = (category: string, network?: string) =>
  `products:${category}:${network ?? "all"}`;

type CachedProductsPayload = {
  timestamp: number;
  data: Product[];
};

// -----------------------------
// LocalStorage Cache (SAFE)
// -----------------------------
const readCachedProducts = (
  category: string,
  network?: string
): CachedProductsPayload | null => {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(getCacheKey(category, network));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CachedProductsPayload;

    if (
      !parsed ||
      !Array.isArray(parsed.data) ||
      typeof parsed.timestamp !== "number"
    ) {
      return null;
    }

    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) {
      return null;
    }

    return parsed;
  } catch (e) {
    console.error("Cache read error:", e);
    return null;
  }
};

const writeCachedProducts = (
  category: string,
  network: string | undefined,
  data: Product[]
) => {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(
      getCacheKey(category, network),
      JSON.stringify({
        timestamp: Date.now(),
        data,
      })
    );
  } catch (e) {
    console.warn("Cache write failed:", e);
  }
};

// -----------------------------
// SAFE FETCH (NO CRASHES)
// -----------------------------
export const fetchProducts = async (
  category: string,
  network?: string
): Promise<Product[]> => {
  try {
    let query = supabase
      .from("products")
      .select("*")
      .eq("category", category)
      .eq("is_visible", true)
      .order("sort_order", { ascending: true });

    if (network) {
      query = query.eq("network", network);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Supabase fetch error:", error.message);
      return []; // 🔥 NEVER throw → prevents white screen
    }

    if (!Array.isArray(data)) {
      console.warn("Invalid products response:", data);
      return [];
    }

    // Optional: sanitize fields to prevent UI crashes
    const safeProducts: Product[] = data.map((p: any) => ({
      ...p,
      name: p.name ?? "",
      description: p.description ?? "",
      data_amount: p.data_amount ?? "",
      price: typeof p.price === "number" ? p.price : 0,
    }));

    writeCachedProducts(category, network, safeProducts);

    return safeProducts;
  } catch (err) {
    console.error("Unexpected fetch error:", err);
    return [];
  }
};

// -----------------------------
// REACT QUERY HOOK (STABLE)
// -----------------------------
export function useProducts(category: string, network?: string) {
  const queryClient = useQueryClient();
  const queryKey = ["products", category, network] as const;

  const cached = readCachedProducts(category, network);

  return useQuery({
    queryKey,
    queryFn: () => fetchProducts(category, network),

    // Performance tuning
    staleTime: 1000 * 60 * 5, // 5 min
    gcTime: 1000 * 60 * 10,   // 10 min

    // Use cache instantly if available
    initialData: () =>
      queryClient.getQueryData<Product[]>(queryKey) ??
      cached?.data ??
      [],

    initialDataUpdatedAt: () =>
      queryClient.getQueryState(queryKey)?.dataUpdatedAt ??
      cached?.timestamp ??
      Date.now(),

    // Keep UI stable during refetch
    placeholderData: (prev) => prev ?? [],

    // 🔥 Prevent retry loops if Supabase is down
    retry: 1,

    // Optional debugging
    meta: {
      source: "useProducts",
    },
  });
} 
