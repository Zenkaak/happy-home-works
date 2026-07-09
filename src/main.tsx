import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App.tsx";
import "./index.css";
import { fetchProducts } from "@/hooks/useProducts";
import { registerAppServiceWorker } from "@/lib/registerSW";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const preloads = [
  ["data", "safaricom"],
  ["data", "airtel"],
  ["data", "telkom"],
  ["kplc", undefined],
  ["loans", undefined],
] as const;

function warmProductCache() {
  void Promise.allSettled(
    preloads.map(([category, network]) =>
      queryClient.prefetchQuery({
        queryKey: ["products", category, network],
        queryFn: () => fetchProducts(category, network),
      })
    )
  );
}

function bootstrap() {
  createRoot(document.getElementById("root")!).render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );

  // Defer cache warming until the browser is idle so it never blocks first paint.
  const schedule =
    (window as any).requestIdleCallback ||
    ((cb: () => void) => setTimeout(cb, 200));
  schedule(() => warmProductCache());

  registerAppServiceWorker();
}

bootstrap();
