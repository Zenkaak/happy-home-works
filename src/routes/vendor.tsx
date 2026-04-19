import { createFileRoute } from "@tanstack/react-router";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const Route = createFileRoute("/vendor")({
  head: () => ({
    meta: [
      { title: "Vendor Portal — DASNET" },
      { name: "description", content: "Become a DASNET vendor and earn 10% commission on every sale." },
    ],
  }),
  component: VendorPortal,
});

function VendorPortal() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-md px-4 py-12">
        <h1 className="font-display text-2xl font-bold">Vendor Portal</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Coming in Phase 4 — vendor signup, login, dashboard, withdrawals.
        </p>
      </main>
      <Footer />
    </div>
  );
}
