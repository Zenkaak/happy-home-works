import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Product, ServiceCategory, NetworkProvider } from "@/lib/types";

export const fetchProducts = async (
  category: ServiceCategory,
  network?: NetworkProvider
): Promise<Product[]> => {
  try {
    let query = supabase
      .from("products")
      .select("*")
      .eq("category", category)
      .eq("is_visible", true)
      .order("sort_order", { ascending: true });

    if (network) query = query.eq("network", network);

    const { data, error } = await query;
    if (error) {
      console.error("Products fetch error:", error.message);
      return [];
    }
    return (data ?? []) as Product[];
  } catch (err) {
    console.error("Products fetch threw:", err);
    return [];
  }
};

export function useProducts(category: ServiceCategory, network?: NetworkProvider) {
  const queryClient = useQueryClient();
  const queryKey = ["products", category, network] as const;

  return useQuery({
    queryKey,
    queryFn: () => fetchProducts(category, network),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    initialData: () => queryClient.getQueryData<Product[]>(queryKey),
    placeholderData: (prev) => prev ?? [],
    retry: 1,
  });
}
