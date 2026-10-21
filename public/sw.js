// Minimal, safe service worker for the Anand Mobile & Electrics staff PWA.
// Goals: make the app installable and give a fast app-shell load.
// It deliberately does NOT cache cross-origin requests (e.g. Supabase API/
// storage) so authenticated data and RLS are never served from a stale cache.

const CACHE = 'anand-shell-v2';
const SHELL = ['/', '/index.html', '/favicon.svg', '/manifest.webmanifest', '/logo.jpg'];
importScripts('/precache-manifest.js');

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll([...SHELL, ...(self.__ANAND_PRECACHE || []).map((name) => `/${name}`)])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin GET requests. Everything else (Supabase, POST,
  // auth, storage) goes straight to the network, untouched.
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  // SPA navigations: network-first, fall back to cached shell when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/index.html').then((r) => r || Response.error())),
    );
    return;
  }

  // Static assets only: never cache data endpoints, HTML responses, or staff
  // routes. This keeps authenticated/private responses out of Cache Storage.
  const isStaticAsset = /\.(?:js|css|png|jpg|jpeg|svg|webp|ico|woff2?)$/i.test(url.pathname);
  if (!isStaticAsset) return;

  // Static assets: cache-first, then network (and cache the result).
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }).catch(() => hit || Response.error()),
    ),
  );
});
