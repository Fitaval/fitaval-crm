self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through network fetch so API requests and assets are never stale,
  // while satisfying browser PWA installability requirements.
  if (event.request.method !== 'GET') return;
});
