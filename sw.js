/* ============================================
   JCDURANCASADO · Service Worker
   Cache-first para assets estáticos
============================================ */

const CACHE_NAME = 'jcdc-v1.0.4';

const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/main.js',
  './img/foto.png',
  './manifest.json',
  './img/icons/icon-192.png',
  './img/icons/icon-512.png'
];

/* INSTALL — precachear assets */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

/* ACTIVATE — limpiar caches viejos */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

/* FETCH — cache-first con fallback a red */
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Solo GET
  if (req.method !== 'GET') return;

  // No cachear el formulario de contacto ni APIs externas
  const url = new URL(req.url);
  if (url.pathname.includes('/api/')) return;
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req)
        .then((resp) => {
          if (!resp || resp.status !== 200 || resp.type !== 'basic') return resp;
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, clone));
          return resp;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
