const CACHE_NAME = 'my-portofolio-v6';
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './manifest.webmanifest',
  './icon.svg',
  './calculator/',
  './calculator/index.html',
  './calculator/manifest.webmanifest',
  './restaurant/',
  './restaurant/index.html',
  './restaurant/style.css',
  './restaurant/offline.css',
  './restaurant/app.js',
  './restaurant/manifest.webmanifest'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key.startsWith('my-portofolio-') && key !== CACHE_NAME)
        .map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        return response;
      }).catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const path = new URL(request.url).pathname;
        if (path.endsWith('/calculator/') || path.endsWith('/calculator')) {
          return caches.match('./calculator/index.html');
        }
        return path.endsWith('/restaurant/') || path.endsWith('/restaurant')
          ? caches.match('./restaurant/index.html')
          : caches.match('./index.html');
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response.ok || response.type === 'opaque') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});