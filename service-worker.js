// ============================================================================
// Service Worker: cacheia a casca do app (HTML/CSS/JS/ícones) para permitir
// abrir e usar a calculadora offline. Chamadas ao Firebase (Auth/Firestore)
// não são interceptadas — o próprio SDK do Firestore cuida da persistência
// offline (ver enableIndexedDbPersistence em js/firebase.js).
// ============================================================================
const CACHE_VERSION = "gravimetria-v1";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/styles.css",
  "./js/app.js",
  "./js/firebase.js",
  "./js/state.js",
  "./js/lib/data.js",
  "./js/lib/palette.js",
  "./js/lib/charts.js",
  "./js/lib/export-pdf.js",
  "./js/lib/export-xlsx.js",
  "./js/views/auth-view.js",
  "./js/views/calculadora-view.js",
  "./js/views/historico-view.js",
  "./js/views/dashboard-view.js",
  "./js/views/config-view.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-192.png",
  "./icons/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Nunca intercepta chamadas ao Firebase/Firestore/Auth — deixa o SDK cuidar.
  if (url.hostname.includes("googleapis.com") || url.hostname.includes("firebaseio.com") || url.hostname.includes("google.com")) {
    return;
  }

  // Mesma origem (app shell): cache-first, com atualização em segundo plano.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, networkResponse.clone()));
            return networkResponse;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Bibliotecas de CDN (Chart.js, jsPDF, SheetJS): stale-while-revalidate.
  event.respondWith(
    caches.open(CACHE_VERSION).then(async (cache) => {
      const cached = await cache.match(request);
      const networkPromise = fetch(request)
        .then((response) => {
          cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached || networkPromise;
    })
  );
});
