import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  build: {
    outDir: "dist",
    emptyOutDir: true,
  },

  // IMPORTANT: ensures SPA routing works in production
  preview: {
    port: 4173,
    strictPort: true,
  },
});
