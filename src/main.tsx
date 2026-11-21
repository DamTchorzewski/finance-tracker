import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { RouterProvider } from "@tanstack/react-router";
import { del, get, set } from "idb-keyval";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { toast, Toaster } from "sonner";
import { registerSW } from "virtual:pwa-register";
import { SessionProvider } from "@/auth/session.tsx";
import { DataError } from "@/data/types.ts";
import { browserLocale, I18nProvider } from "@/i18n/i18n.tsx";
import { MESSAGES } from "@/i18n/messages.ts";
import { storedPrefs } from "./app/prefs.ts";
import { router } from "./app/router.tsx";
import "./styles/app.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 24 * 60 * 60_000,
      // a 4xx will not change on a retry; a lost connection might
      retry: (count, error) =>
        !(error instanceof DataError && error.status >= 400 && error.status < 500) && count < 2,
      refetchOnWindowFocus: true,
    },
  },
});

// The last answers are kept in IndexedDB, so the app opens with data at once and can be read offline (PWA).
const persister = createAsyncStoragePersister({
  storage: { getItem: get, setItem: set, removeItem: del },
  key: "ft-query-cache",
});

const locale = storedPrefs()?.locale ?? browserLocale();

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  const update = registerSW({
    onNeedRefresh() {
      toast(MESSAGES[locale].updateReady, {
        duration: Infinity,
        action: { label: MESSAGES[locale].reload, onClick: () => void update(true) },
      });
    },
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider initial={locale}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister,
          maxAge: 7 * 24 * 60 * 60_000,
          buster: "v2",
          // the demo already lives in this browser; only a real account's answers are worth keeping offline
          dehydrateOptions: {
            shouldDehydrateQuery: (query) =>
              query.queryKey[0] !== "demo" && query.state.status === "success",
          },
        }}
      >
        <SessionProvider>
          <RouterProvider router={router} />
          <Toaster position="top-center" richColors closeButton theme="system" />
        </SessionProvider>
      </PersistQueryClientProvider>
    </I18nProvider>
  </StrictMode>,
);
