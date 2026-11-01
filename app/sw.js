// Offline-Fähigkeit: Online kommt jede Datei frisch vom Server (Netz zuerst),
// die gespeicherte Kopie springt nur ein, wenn keine Verbindung besteht.
// VERSION bei Änderungen trotzdem erhöhen, damit der Offline-Vorrat erneuert wird.
const VERSION = 'v6';
const CACHE = `fitness-${VERSION}`;
const FILES = [
  './', './index.html', './manifest.webmanifest', './css/app.css',
  './icons/apple-touch-icon.png', './icons/icon-192.png', './icons/icon-512.png',
  './js/app.js', './js/core.js', './js/store.js', './js/util.js', './js/ui.js', './js/icons.js', './js/timer.js',
  './js/nutrition.js', './js/training.js', './js/progress.js', './js/photos.js', './js/off.js', './js/ai.js',
  './js/data/foods.js', './js/data/recipes.js', './js/data/exercises.js', './js/data/tabler.js',
  './js/views/ernaehrung.js', './js/views/dashboard.js', './js/views/training.js', './js/views/progress.js', './js/views/einstellungen.js',
  './vendor/anthropic-sdk.mjs', './vendor/node-buffer.mjs', './vendor/node-process.mjs', './vendor/node-events.mjs',
  './vendor/node-tty.mjs', './vendor/node-async_hooks.mjs',
];

// cache: 'reload' umgeht den HTTP-Cache des Browsers, sonst landen bis zu 10 Minuten alte Dateien im Vorrat.
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true })),
  );
});
