// Retired service worker. An earlier build registered a caching worker at /sw.js; this replacement
// clears its caches and unregisters itself so returning visitors always get the live app.
// (OneSignal push uses its own worker, OneSignalSDKWorker.js.)
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: "window" });
      clients.forEach(client => client.navigate(client.url));
    })(),
  );
});
