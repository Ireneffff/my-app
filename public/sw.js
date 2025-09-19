self.addEventListener("install", (event) => {
  console.log("Service Worker: installazione…");
  event.waitUntil(
    caches.open("app-cache").then((cache) => {
      return cache.addAll(["/"]);
    })
  );
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker: attivato ✅");
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});