import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vitest/config";

// The app is served from the root of its Firebase Hosting site; /api is the same origin (Hosting rewrites it to
// Cloud Run). Locally `pnpm dev` proxies /api to the API on :8080 (VITE_API_PROXY overrides the target).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  return {
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
      // loadEnv also reads .env.local, which process.env does not see here; empty = the local API
      proxy: { "/api": env.VITE_API_PROXY || "http://localhost:8080" },
    },
    build: {
      target: "es2023",
      sourcemap: false,
      // fonts stay files: the CSP (font-src 'self') blocks a font inlined as data:
      assetsInlineLimit: (file) => (file.endsWith(".woff2") ? false : undefined),
    },
    test: {
      environment: "jsdom",
      include: ["src/**/*.test.{ts,tsx}"],
      setupFiles: ["src/test/setup.ts"],
    },
  };
});
