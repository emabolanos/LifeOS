/*
 * sw.js — Permite abrir LifeOS sin conexión.
 * Estrategia "red primero": con internet siempre se usa la versión más
 * reciente publicada; sin internet se usa la última copia guardada.
 * No toca los datos financieros (esos viven en localStorage).
 */
const CACHE = 'lifeos-v5';
const ASSETS = [
  './', 'index.html', 'manifest.webmanifest', 'css/styles.css',
  'js/money.js', 'js/dates.js', 'js/storage.js', 'js/icons.js', 'js/model.js', 'js/app.js',
  'icons/icon-192.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png',
  'fonts/source-sans-3-latin.woff2', 'fonts/source-sans-3-latin-ext.woff2',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true })
        .then((hit) => hit || (req.mode === 'navigate' ? caches.match('index.html') : undefined))
        .then((hit) => hit || Response.error())),
  );
});
