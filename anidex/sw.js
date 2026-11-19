// Anidex service worker: offline app shell. API data is cached by the app (localStorage), images by the HTTP cache.
const VERSION = 'anidex-v1.1.0';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/styles.css',
  'js/app.js', 'js/api.js', 'js/config.js', 'js/dom.js', 'js/i18n.js', 'js/router.js', 'js/store.js', 'js/ui.js',
  'js/screens/home.js', 'js/screens/search.js', 'js/screens/detail.js', 'js/screens/saved.js', 'js/screens/profile.js',
  'js/screens/profile-bell.js', 'js/screens/notifications.js', 'js/screens/list.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png',
  'fonts/inter-latin-400-normal.woff2', 'fonts/inter-latin-500-normal.woff2', 'fonts/inter-latin-600-normal.woff2', 'fonts/inter-latin-700-normal.woff2', 'fonts/inter-latin-800-normal.woff2',
  'fonts/inter-cyrillic-400-normal.woff2', 'fonts/inter-cyrillic-500-normal.woff2', 'fonts/inter-cyrillic-600-normal.woff2', 'fonts/inter-cyrillic-700-normal.woff2', 'fonts/inter-cyrillic-800-normal.woff2',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)));      // no skipWaiting: the app asks the user first
});
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
  if (e.data === 'GET_VERSION' && e.ports[0]) e.ports[0].postMessage(VERSION);
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;           // AniList API / images: network (app handles caching)
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => {
      const net = fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
        return res;
      }).catch(() => hit || (req.mode === 'navigate' ? caches.match('index.html') : undefined));
      return hit || net;                                  // cache-first, refresh in background
    })
  );
});
