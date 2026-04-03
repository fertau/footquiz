const CACHE_NAME = 'futquiz-v4';
const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/router.js',
  './js/game.js',
  './js/data.js',
  './js/generators.js',
  './js/views/home.js',
  './js/views/categories.js',
  './js/views/carrera.js',
  './js/views/companeros.js',
  './js/views/pasaporte.js',
  './js/views/quiensoy.js',
  './js/views/conexion.js',
  './js/views/linea.js',
  './js/effects.js',
  './js/views/result.js',
  './data/players.json',
  './data/categories.json',
  './data/trivia-mundiales.json',
  './data/trivia-finales.json',
  './data/trivia-clasicos.json',
  './js/views/trivia.js',
  './manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
