/* Versiona la cache per gestire gli update */
const CACHE_NAME = "pwa-cache-v1";
const PRECACHE_URLS = [
  "/",
  "/offline.html",
  "/manifest.json",
  "/icon-192x192.png",
  "/icon-512x512.png",
];

self.addEventListener("install", (event) => {
  // Nota: precache per first-load e offline
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Nota: rimuove cache vecchie quando bumpi CACHE_NAME
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : undefined)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Bypassa richieste non GET
  if (request.method !== "GET") return;

  event.respondWith(
    (async () => {
      try {
        // Network first: prende sempre la versione più nuova
        const network = await fetch(request);
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, network.clone()).catch(() => {});
        return network;
      } catch {
        // Se offline: prova cache → altrimenti offline.html per navigazioni
        const cached = await caches.match(request);
        if (cached) return cached;

        if (request.mode === "navigate") {
          return caches.match("/offline.html");
        }
        throw new Error("Offline e risorsa non in cache");
      }
    })()
  );
});