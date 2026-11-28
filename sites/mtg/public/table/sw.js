// Network first for the page's own files, cached copy when offline. Scryfall requests are not touched.
const CACHE = 'tablecards-v1';
const SHELL = ['./', 'index.html', 'app.js', 'manifest.webmanifest', 'icon-192.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin || e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then((r) => {
    const copy = r.clone(); caches.open(CACHE).then((c) => c.put(u.pathname === location.pathname ? './' : e.request, copy)).catch(() => {});
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('./'))));
});
