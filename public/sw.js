// Minimal service worker: caches only the static app shell (icons, manifest)
// so the app installs cleanly and repeat loads feel instant. Deliberately
// does NOT cache HTML pages or any Supabase/API calls — gas prices, order
// status, and auth must always come from the network, never a stale cache.
const CACHE_NAME = "claugas-shell-v1";
const SHELL_ASSETS = [
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only handle GET requests for same-origin shell assets — everything
  // else (API calls, Supabase, navigation requests) goes straight to the
  // network untouched.
  if (event.request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }
  if (!SHELL_ASSETS.includes(url.pathname)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
