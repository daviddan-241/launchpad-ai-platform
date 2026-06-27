const CACHE_NAME = 'leadforge-shell-v2';
const APP_SHELL = [
  '/',
  '/login',
  '/signup',
  '/chat',
  '/offline',
  '/manifest.webmanifest',
  '/leadforge-icon-192.png',
  '/leadforge-icon-512.png',
  '/leadforge-icon.png',
  '/apple-touch-icon.png',
  '/leadforge-mark.svg',
  '/leadforge-wordmark.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/')) return;
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res.ok) caches.open(CACHE_NAME).then((c) => c.put(event.request, res.clone())).catch(() => {});
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === 'navigate') {
          const offline = await caches.match('/offline');
          if (offline) return offline;
        }
        throw new Error('Offline and no cache match');
      })
  );
});

self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
