import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

// The app is served from the root of its Firebase Hosting site; /api is the same origin (Hosting rewrites it to
// Cloud Run). Locally `pnpm dev` proxies /api to the API on :8080 (VITE_API_PROXY overrides the target).
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "prompt",
      injectRegister: false,
      manifest: false,
      // the app registers the worker itself (src/main.tsx) and asks before it updates
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,woff2,webp,png}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//, /^\/__\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/api/rates"),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "rates",
              expiration: { maxEntries: 60, maxAgeSeconds: 7 * 86400 },
            },
          },
        ],
      },
    }),
  ],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: {
    port: 5173,
    proxy: { "/api": process.env.VITE_API_PROXY ?? "http://localhost:8080" },
  },
  build: { target: "es2023", sourcemap: false },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["src/test/setup.ts"],
  },
});
