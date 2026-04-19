import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const orderSearch = z.object({
  product: z.string().optional(),
  ref: z.string().optional(),
});

export const Route = createFileRoute("/order/$id")({
  validateSearch: orderSearch,
  head: () => ({ meta: [{ title: "Order Status — DASNET" }, { name: "robots", content: "noindex" }] }),
  component: OrderStatus,
});

function OrderStatus() {
  const { id } = Route.useParams();
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-md px-4 py-12">
        <h1 className="font-display text-2xl font-bold">Order #{id}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Coming in Phase 2 — checkout modal, M-Pesa STK push, live order status.
        </p>
      </main>
      <Footer />
    </div>
  );
}
