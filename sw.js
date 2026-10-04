/* ============================================
   JCDURANCASADO · Service Worker
   Estrategia mixta:
   · HTML → network-first (siempre la versión nueva)
   · Assets → cache-first (rápido + offline)
============================================ */

const CACHE_NAME = 'jcdc-v1.0.13';

const ASSETS = [
  // Páginas
  './',
  './index.html',
  './toolkit.html',
  './netpro.html',
  './cotizador.html',
  './cursos.html',
  // Estilos
  './css/style.css',
  // Scripts
  './js/main.js',
  './js/cotizador.js',
  './js/netpro.js',
  // Manifest y assets
  './manifest.json',
  './img/foto.png',
  './img/icons/icon-192.png',
  './img/icons/icon-512.png'
];

/* ============================================
   INSTALL — precachear assets
============================================ */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // addAll falla si UN solo asset falla. Los agregamos uno a uno
        // para que un icono faltante no rompa toda la instalación.
        return Promise.all(
          ASSETS.map((url) =>
            cache.add(url).catch((err) => {
              console.warn('[SW] No se pudo cachear:', url, err);
            })
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

/* ============================================
   ACTIVATE — limpiar caches viejos
============================================ */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

/* ============================================
   FETCH — estrategia mixta
============================================ */
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Solo GET
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // No interceptar APIs externas ni el backend de contacto
  if (url.pathname.includes('/api/')) return;
  if (url.origin !== self.location.origin) return;

  // ----------------------------------------
  // HTML (navegación) → network-first
  // ----------------------------------------
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          if (resp && resp.status === 200 && resp.type === 'basic') {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, clone));
          }
          return resp;
        })
        .catch(() =>
          caches.match(req).then((c) => c || caches.match('./index.html'))
        )
    );
    return;
  }

  // ----------------------------------------
  // Assets (CSS / JS / imágenes / fuentes locales) → cache-first
  // ----------------------------------------
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req)
        .then((resp) => {
          // Solo cachear respuestas válidas del mismo origen
          if (!resp || resp.status !== 200 || resp.type !== 'basic') {
            return resp;
          }
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, clone));
          return resp;
        })
        .catch(() => {
          // Offline y no está en cache → error silencioso (no HTML)
          return new Response('', {
            status: 408,
            statusText: 'Offline'
          });
        });
    })
  );
});

/* ============================================
   MESSAGE — permite forzar skipWaiting desde main.js
   (opcional: úsalo si quieres aplicar updates al instante)
============================================ */
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

/* ============================================
   PUSH NOTIFICATIONS
   · El SW recibe la orden de mostrar la notificación
   · Al hacer clic, abre/enfoca la ventana
============================================ */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || './';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus();
            if ('navigate' in client && targetUrl !== './') {
              client.navigate(targetUrl);
            }
            return;
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

/* ============================================
   PUSH (servidor → cliente, preparado para futuro)
============================================ */
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {
    title: 'JCDC',
    body: 'Nuevo aviso',
    url: './'
  };

  try {
    payload = Object.assign({}, payload, event.data.json());
  } catch (e) {
    payload.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: './img/icons/icon-192.png',
      badge: './img/icons/icon-192.png',
      data: { url: payload.url }
    })
  );
});
