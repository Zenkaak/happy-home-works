/// <reference types="vite/client" />
import { createRootRoute, Outlet, HeadContent, Scripts } from "@tanstack/react-router";
import { type ReactNode, useEffect, useState } from "react";
import App from "../App";
import "../index.css";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
      { title: "DASNET | Instant Bundles" },
      { name: "description", content: "Buy data bundles and KPLC tokens instantly." },
      { name: "author", content: "DASNET" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "DASNET | Instant Bundles" },
      { property: "og:description", content: "Buy data bundles and KPLC tokens instantly." },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "DASNET | Instant Bundles" },
      { name: "twitter:description", content: "Buy data bundles and KPLC tokens instantly." },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Manrope:wght@500;600;700;800;900&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: () => null,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <style
          dangerouslySetInnerHTML={{
            __html:
              "html, body { margin: 0; background: #0a0e1a; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }",
          }}
        />
      </head>
      <body>
        <div id="root">{children}</div>
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  // App uses react-router-dom's BrowserRouter which needs `document`.
  // Render only on the client to avoid SSR ReferenceError.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <>
      {mounted ? <App /> : null}
      <div style={{ display: "none" }}>
        <Outlet />
      </div>
    </>
  );
}
