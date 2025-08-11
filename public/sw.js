const CACHE_NAME = 'scio-shell-v2';
const SHELL_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/site-logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

// Basic runtime caching: cache-first for same-origin static, network-first for others
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle GET
  if (request.method !== 'GET') return;

  // Never touch cross-origin (e.g., Supabase) requests
  if (url.origin !== location.origin) return;

  const isApi = url.pathname.startsWith('/api/');
  const isDocument = request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html');
  const isAsset = ['image', 'style', 'script', 'font'].includes(request.destination);

  // Network-first for documents and API requests; do not cache API responses
  if (isApi || isDocument) {
    event.respondWith(
      fetch(request).catch(async () => {
        // Offline fallback only for navigations
        if (isDocument) {
          const cached = await caches.match('/');
          if (cached) return cached;
        }
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
      })
    );
    return;
  }

  // Cache-first for static assets only; never cache errors/opaque
  if (isAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then(async (res) => {
          if (res && res.ok && res.type === 'basic') {
            const resClone = res.clone();
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, resClone);
          }
          return res;
        });
      })
    );
    return;
  }
});


