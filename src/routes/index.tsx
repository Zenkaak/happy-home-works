import { createFileRoute } from "@tanstack/react-router";

// This route is intentionally empty. The real app lives in src/App.tsx and uses
// react-router-dom (BrowserRouter) which is mounted from __root.tsx.
export const Route = createFileRoute("/")({
  component: () => null,
});
