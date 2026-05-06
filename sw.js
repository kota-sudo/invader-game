/** index.html の `?v=` と同リリースで揃えるとキャッシュ不整合が減る */
const CACHE = 'invader-core-mars-v18';
/** プリキャッシュ候補（1本でも失敗しても install を全体失敗させない） */
const STATIC = [
  './index.html',
  './style.css',
  './css/stage-select.css',
  './css/galaxy-map.css',
  './main.js',
  './manifest.json',
  './icons/icon-192.svg',
  './icons/icon-512.svg',
  './assets/player/dragon-lord.png',
  './js/game-data.js',
  './js/game/game-store.js',
  './js/game/update-tick.js',
  './js/game/draw-dispatch.js',
  './js/game/constants.js',
  './js/game/input.js',
  './js/game/storage-helpers.js',
  './js/game/save-guard.js',
  './js/game/economy.js',
  './js/app/polyfills.js',
  './js/app/dev-flags.js',
  './js/app/global-error-handlers.js',
  './js/app/game-loop.js',
  './js/game/login-bonus.js',
  './js/game/inbox-storage.js',
  './js/game/mission-persist.js',
  './js/game/missions-runtime.js',
  './js/app/escape-html.js',
  './js/app/build-version.js',
];

async function precacheOrSkip(cache, urls) {
  await Promise.allSettled(
    urls.map((url) =>
      cache.add(url).catch(() => {
        /* 404 やオフライン時はスキップ。fetch 戦略で後追い取得される */
      })
    )
  );
}

/** respondWith に渡す Promise がrejectしないようにする（Failed to fetch 対策） */
async function putCacheSafe(cacheName, request, response) {
  if (!response || !response.ok) return;
  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
  } catch (_) {
    /* quota / opaque / locked */
  }
}

function offlineTextResponse() {
  return new Response('Offline — try reloading when the dev server is running.', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

async function matchIndexFallback() {
  return (
    (await caches.match('./index.html')) ||
    (await caches.match('/index.html')) ||
    (await caches.match('index.html'))
  );
}

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => precacheOrSkip(c, STATIC)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // main.js は ?v=XX 付きURL→バージョンが変われば別URLなのでキャッシュファーストでOK
  if (url.pathname.endsWith('main.js')) {
    e.respondWith(
      (async () => {
        try {
          const cached = await caches.match(req);
          if (cached) return cached;
          const res = await fetch(req);
          await putCacheSafe(CACHE, req, res);
          return res;
        } catch (err) {
          const cached = await caches.match(req);
          if (cached) return cached;
          console.warn('[sw] main.js', err);
          return offlineTextResponse();
        }
      })()
    );
    return;
  }

  // 静的データは export が増えることがある。キャッシュ優先だと古い game-data で import エラーになるためネットワーク優先。
  if (url.pathname.endsWith('/js/game-data.js')) {
    e.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          await putCacheSafe(CACHE, req, res);
          return res;
        } catch (err) {
          const cached = await caches.match(req);
          if (cached) return cached;
          console.warn('[sw] game-data.js', err);
          return offlineTextResponse();
        }
      })()
    );
    return;
  }

  // HTML はネットワーク優先
  if (req.mode === 'navigate') {
    e.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          if (res.ok) await putCacheSafe(CACHE, req, res);
          return res;
        } catch (err) {
          const cached = await matchIndexFallback();
          if (cached) return cached;
          console.warn('[sw] navigate', err);
          return new Response(
            '<!DOCTYPE html><meta charset="utf-8"><title>Offline</title><p>ネットワークに接続できません。開発サーバーが動いているか確認してください。</p>',
            { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        }
      })()
    );
    return;
  }

  // その他はキャッシュ優先（fetch 失敗時はキャッシュ→503 で Promise を reject しない）
  e.respondWith(
    (async () => {
      try {
        const cached = await caches.match(req);
        if (cached) return cached;
        const res = await fetch(req);
        await putCacheSafe(CACHE, req, res);
        return res;
      } catch (err) {
        const cached = await caches.match(req);
        if (cached) return cached;
        console.warn('[sw] asset', req.url, err);
        return offlineTextResponse();
      }
    })()
  );
});
