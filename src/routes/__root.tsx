/// <reference types="vite/client" />
import {
  createRootRoute,
  Outlet,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { type ReactNode, useEffect } from "react";
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

  // keep simple safe fallback (NO App here)
  notFoundComponent: () => null,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body { margin: 0; background: #ffffff; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
              #boot-splash {
                position: fixed;
                inset: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #ffffff;
                z-index: 9999;
                transition: opacity 250ms ease;
              }
              #boot-splash.hide {
                opacity: 0;
                pointer-events: none;
              }
              #boot-splash .spinner {
                width: 36px;
                height: 36px;
                border: 3px solid #e5e7eb;
                border-top-color: #2563eb;
                border-radius: 50%;
                animation: bs-spin 0.8s linear infinite;
              }
              @keyframes bs-spin {
                to { transform: rotate(360deg); }
              }
            `,
          }}
        />
      </head>
      <body>
        <div id="boot-splash">
          <div className="spinner" />
        </div>

        <div id="root">{children}</div>
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  useEffect(() => {
    const splash = document.getElementById("boot-splash");

    if (splash) {
      splash.classList.add("hide");
      setTimeout(() => splash.remove(), 300);
    }
  }, []);

  // IMPORTANT FIX:
  // Render App directly (no mounted state, no SSR blocking)
  return (
    <>
      <App />
      <div style={{ display: "none" }}>
        <Outlet />
      </div>
    </>
  );
}
