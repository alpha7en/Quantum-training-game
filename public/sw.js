const CACHE_NAME = 'quantum-sim-v3';
const INDEX_URL = new URL('./index.html', self.location.href).toString();
const ASSETS_TO_CACHE = [
  new URL('./', self.location.href).toString(),
  INDEX_URL,
  new URL('./manifest.json', self.location.href).toString(),
  new URL('./icon.svg', self.location.href).toString(),
  'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css',
  'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js',
  'https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js'
];

const cacheResponse = (request, response) => {
  return caches.open(CACHE_NAME)
    .then((cache) => cache.put(request, response))
    .catch((err) => {
      console.warn('Cache update failed:', err);
    });
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            const responseForIndex = networkResponse.clone();
            cacheResponse(event.request, responseToCache);
            cacheResponse(INDEX_URL, responseForIndex);
          }
          return networkResponse;
        })
        .catch(() => caches.match(INDEX_URL))
    );
    return;
  }

  const url = new URL(event.request.url);

  // Skip Vite HMR / dev server specific requests
  if (
    url.pathname.includes('hmr') ||
    url.pathname.startsWith('/@vite') ||
    url.pathname.startsWith('/@id') ||
    url.pathname.startsWith('/@fs') ||
    url.pathname.endsWith('.ts') ||
    url.pathname.endsWith('.tsx')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Serve from cache, but update cache in background (Stale-While-Revalidate)
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              cacheResponse(event.request, responseToCache);
            }
          })
          .catch(() => {
            // Ignore background fetch errors (e.g. offline)
          });
        return cachedResponse;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }
          // Only cache same-origin resources or the KaTeX CDN resources
          const isSameOrigin = url.origin === self.location.origin;
          const isCDN = url.hostname.includes('cdn.jsdelivr.net');
          if (isSameOrigin || isCDN) {
            const responseToCache = networkResponse.clone();
            cacheResponse(event.request, responseToCache);
          }
          return networkResponse;
        })
        .catch((err) => {
          console.warn('Network request failed:', err);
          return caches.match(event.request);
        });
    })
  );
});
