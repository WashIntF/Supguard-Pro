// SupGuard Pro service worker
const SW_VERSION = 'v1';
const CACHE_NAME = 'supguard-pro-' + SW_VERSION;

const APP_SHELL = [
  './',
  './clean_agent_inspection.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch((err) => {
      console.warn('SupGuard Pro SW: precache failed', err);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(
      names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Never intercept cross-origin requests (Google APIs, Drive, etc.) — let them hit the network directly.
  if (url.origin !== self.location.origin) {
    return;
  }

  // Network-first for HTML app files so updates are picked up as soon as they're published.
  if (req.mode === 'navigate' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('./clean_agent_inspection.html')))
    );
    return;
  }

  // Cache-first for everything else in the app shell (manifest, icons).
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      const resClone = res.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
      return res;
    }).catch(() => cached))
  );
});
