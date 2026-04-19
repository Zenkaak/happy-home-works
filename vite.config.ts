import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
vite: {
build: {
// This ensures that for Vercel, everything is bundled into one clean
// directory that Vercel can actually see.
outDir: 'dist',
// Disabling SSR for the production build often fixes the "blank screen"
// on Vercel for TanStack Start projects.
ssr: false,
},
},
});
