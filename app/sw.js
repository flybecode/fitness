// Speichert alle App-Dateien für die Offline-Nutzung.
// Nach Änderungen an der App VERSION erhöhen, damit das iPhone die neuen Dateien lädt.
const VERSION = 'v1';
const CACHE = `fitness-${VERSION}`;
const FILES = [
  './', './index.html', './manifest.webmanifest', './css/app.css',
  './icons/apple-touch-icon.png', './icons/icon-192.png', './icons/icon-512.png',
  './js/app.js', './js/core.js', './js/store.js', './js/util.js', './js/ui.js', './js/icons.js',
  './js/nutrition.js', './js/training.js', './js/timer.js',
  './js/data/foods.js', './js/data/recipes.js', './js/data/exercises.js', './js/data/templates.js',
  './js/views/heute.js', './js/views/ernaehrung.js', './js/views/training.js', './js/views/koerper.js', './js/views/einstellungen.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request)));
});
