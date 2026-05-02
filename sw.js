const CACHE = 'planet-v20';
const STATIC = [
  './index.html', './style.css',
  './js/game-data.js', './js/game/game-store.js', './js/game/update-tick.js',
  './js/game/draw-dispatch.js', './js/game/constants.js', './js/game/input.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // main.js は ?v=XX 付きURL→バージョンが変われば別URLなのでキャッシュファーストでOK
  if (url.pathname.endsWith('main.js')) {
    e.respondWith(
      caches.match(req).then(r => r || fetch(req).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(req, clone));
        return res;
      }))
    );
    return;
  }

  // HTML はネットワーク優先
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(req, clone));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // その他はキャッシュ優先
  e.respondWith(
    caches.match(req).then(r => r || fetch(req).then(res => {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(req, clone));
      return res;
    }))
  );
});
