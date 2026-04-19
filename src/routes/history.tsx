import { createFileRoute } from "@tanstack/react-router";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Order History — DASNET" },
      { name: "description", content: "View your DASNET order history and transaction status." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="font-display text-2xl font-bold">Order History</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Coming in Phase 2 — your transactions will appear here, looked up by phone number.
        </p>
      </main>
      <Footer />
    </div>
  );
}
