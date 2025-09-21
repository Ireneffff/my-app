const VERSION = "v6"; // ← incrementa ad ogni deploy
const CACHE_NAME = `pwa-cache-${VERSION}`;
const PRECACHE = [
  "/",                   // solo se la home è staticamente servibile
  "/offline.html",       // opzionale: crea public/offline.html
  "/manifest.json",
  "/icon-192x192.png",
  "/icon-512x512.png",
];

// Aggiornamento immediato su richiesta dell'app (banner → postMessage)
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    // Perché: attivare subito la nuova versione senza attendere chiusura tab
    self.skipWaiting();
  }
});

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(PRECACHE.filter(Boolean));
      } catch {
        // Silenzioso: la mancata precache non deve bloccare l'install
      } finally {
        // Perché: passare a 'waiting' il prima possibile
        self.skipWaiting();
      }
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Perché: rimuovere cache obsolete e prendere controllo immediato
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Non gestire non-GET o richieste di navigazione con credenziali speciali
  if (req.method !== "GET") return;

  // Strategia: network-first con fallback cache; utile per CSS/JS e HTML
  event.respondWith(networkFirst(req));
});

// ------------------------------
// Helpers
// ------------------------------
async function networkFirst(req) {
  try {
    const fresh = await fetch(req, { credentials: "same-origin" });
    // Cache solo risposte valide e della stessa origine
    if (fresh && fresh.ok && fresh.type === "basic") {
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch {
    // Fallback: prova cache
    const cached = await caches.match(req, { ignoreSearch: true });
    if (cached) return cached;

    // Per richieste di navigazione (HTML), prova l'offline fallback
    if (isNavigationRequest(req)) {
      const offline = await caches.match("/offline.html");
      if (offline) return offline;
    }
    // Ultimo fallback: 503 testuale
    return new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
  }
}

function isNavigationRequest(req) {
  return req.mode === "navigate" || (req.destination === "document" && req.headers.get("accept")?.includes("text/html"));
}