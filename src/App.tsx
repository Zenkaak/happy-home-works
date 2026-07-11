import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import { CheckoutProvider } from "./contexts/CheckoutContext";

// Lazy-load every non-critical route so the Index bundle ships instantly.
const History = lazy(() => import("./pages/History"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const VendorPortal = lazy(() => import("./pages/VendorPortal"));
const OrderStatus = lazy(() => import("./pages/OrderStatus"));
const NotFound = lazy(() => import("./pages/NotFound"));
const TestPackages = lazy(() => import("./pages/TestPackages"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <CheckoutProvider>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/index" element={<Index />} />
              <Route path="/data" element={<Index initialCategory="data" />} />
              <Route path="/data/:network" element={<Index initialCategory="data" />} />
              <Route path="/kplc" element={<Index initialCategory="kplc" />} />
              <Route path="/tokens" element={<Index initialCategory="kplc" />} />
              <Route path="/loans" element={<Index initialCategory="loans" />} />
              <Route path="/fuliza" element={<Index initialCategory="loans" />} />
              <Route path="/history" element={<History />} />
              <Route path="/admin" element={<AdminLogin />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/vendor" element={<VendorPortal />} />
              <Route path="/order/:id" element={<OrderStatus />} />
              <Route path="/test" element={<TestPackages />}>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </CheckoutProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
