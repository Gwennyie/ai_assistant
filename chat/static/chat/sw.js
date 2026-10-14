const CACHE = 'ai-assistant-v1';
const ASSETS = [
  '/',
  '/offline/',
  '/static/chat/css/style.css',
  '/static/chat/js/app.js',
  '/static/chat/icons/icon-192.png',
  '/static/chat/icons/icon-512.png',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.all(ASSETS.map((u) => c.add(u).catch(() => null)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;          // never cache the API POST

  if (req.mode === 'navigate') {             // pages: network first, offline fallback
    e.respondWith(
      fetch(req).catch(() => caches.match(req).then((r) => r || caches.match('/offline/')))
    );
    return;
  }
  e.respondWith(                             // assets: cache first
    caches.match(req).then((r) => r || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
      return res;
    }))
  );
});