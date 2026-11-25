// The first address of the app (<project>.web.app) only redirects to the new one. A browser that installed the app
// there still runs its service worker, so this one replaces it: it clears the caches and unregisters itself.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) await caches.delete(key);
      await self.registration.unregister();
      for (const client of await self.clients.matchAll({ type: "window" }))
        client.navigate(client.url);
    })(),
  );
});
