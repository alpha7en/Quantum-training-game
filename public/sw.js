// Self-cleaning service worker: immediately unregisters itself and deletes all cache storages.
// This resolves the deadlock where a cached broken version of the app prevents updates.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map(key => caches.delete(key)));
    }).then(() => {
      return self.registration.unregister();
    }).then(() => {
      return self.clients.matchAll();
    }).then((clients) => {
      clients.forEach(client => {
        if (client.url) {
          try {
            client.navigate(client.url);
          } catch (e) {
            console.error('Failed to reload client:', e);
          }
        }
      });
    })
  );
});
