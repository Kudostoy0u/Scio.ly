const CACHE_NAME = 'scio-shell-v3';
const SHELL_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/site-logo.png',
  '/offline',
  // Precache key app pages for offline shell routing
  '/dashboard',
  '/practice',
  '/test',
  '/unlimited',
  '/codebusters'
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
  const isAsset = ['image', 'style', 'script', 'font'].includes(request.destination) || url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/_next/image');

  // Network-first for API requests; for documents prefer cached shell when offline
  if (isApi) {
    event.respondWith(fetch(request).catch(() => new Response('Offline', { status: 503, statusText: 'Service Unavailable' })));
    return;
  }

  if (isDocument) {
    event.respondWith((async () => {
      try {
        const res = await fetch(request);
        // Cache successful document responses for offline reuse
        if (res && res.ok && res.type === 'basic') {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, res.clone());
        }
        return res;
      } catch {
        // Prefer cached page, then home shell, then offline page
        const cachedDoc = await caches.match(request);
        if (cachedDoc) return cachedDoc;
        const cachedHome = await caches.match('/');
        if (cachedHome) return cachedHome;
        const offlinePage = await caches.match('/offline');
        if (offlinePage) return offlinePage;
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
      }
    })());
    return;
  }

  // Cache-first for static assets; on offline miss, return safe fallbacks
  if (isAsset) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      try {
        const res = await fetch(request);
        if (res && res.ok && res.type === 'basic') {
          const resClone = res.clone();
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, resClone);
        }
        return res;
      } catch {
        // Fallbacks when offline and not cached
        if (request.destination === 'image' || url.pathname.startsWith('/_next/image')) {
          const fallback = await caches.match('/site-logo.png');
          if (fallback) return fallback;
          return new Response('', { status: 200, headers: { 'content-type': 'image/png' } });
        }
        if (request.destination === 'style') {
          return new Response('', { status: 200, headers: { 'content-type': 'text/css' } });
        }
        if (request.destination === 'script' || url.pathname.startsWith('/_next/static/')) {
          return new Response('', { status: 200, headers: { 'content-type': 'application/javascript' } });
        }
        if (request.destination === 'font') {
          return new Response('', { status: 200 });
        }
        return new Response('', { status: 200 });
      }
    })());
    return;
  }
});

// Background Sync handler (one-off)
self.addEventListener('sync', (event) => {
  if (event.tag === 'scio-sync') {
    event.waitUntil(
      caches.open(CACHE_NAME).then(async (cache) => {
        try {
          const resp = await fetch('/');
          if (resp && resp.ok) {
            cache.put('/', resp.clone());
          }
        } catch {}
      })
    );
  }
});

// Periodic Background Sync handler (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'scio-periodic') {
    event.waitUntil(
      caches.open(CACHE_NAME).then(async (cache) => {
        try {
          const urls = ['/', '/manifest.webmanifest'];
          await Promise.all(urls.map(async (url) => {
            try {
              const resp = await fetch(url, { cache: 'no-store' });
              if (resp && resp.ok) {
                cache.put(url, resp.clone());
              }
            } catch {}
          }));
        } catch {}
      })
    );
  }
});


