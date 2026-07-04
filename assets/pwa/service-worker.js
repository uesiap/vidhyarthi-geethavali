const CACHE_NAME = 'vg-shell-v1';

// Only your static app shell — nothing else
const SHELL_ASSETS = [
  '/vidhyarthi-geethavali/',
  '/vidhyarthi-geethavali/index.html',
  '/vidhyarthi-geethavali/Icon192.png',
  '/vidhyarthi-geethavali/Icon512.png',
  '/vidhyarthi-geethavali/uesisongsmain.jpg'
];

// ── Install: pre-cache shell only ───────────────────────────────────
self.addEventListener('install', event => {
  console.log('Service Worker: Installing');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Service Worker: Cache opened');
      return cache.addAll(SHELL_ASSETS);
    })
  );
  self.skipWaiting();
});

// ── Activate: delete every old cache version ─────────────────────────
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => {
          console.log('Service Worker: Deleting old cache:', k);
          return caches.delete(k);
        })
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: three strict rules ────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // RULE 1 — Never intercept JSON data files.
  //          sessionStorage in the page handles caching these.
  //          If SW cached them, users would never see song updates.
  if (url.includes('/data/') && url.endsWith('.json')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // RULE 2 — Never intercept cross-origin requests.
  //          Audio/track CDN files, fonts, icon libraries etc.
  //          must always go straight to their origin servers.
  if (!url.startsWith(self.location.origin)) {
    event.respondWith(fetch(event.request));
    return;
  }

  // RULE 3 — For same-origin requests: cache-first for shell assets,
  //          network-only for everything else (no silent caching).
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        console.log('Service Worker: Cache hit:', url);
        return cached;
      }

      // Not in cache — fetch from network
      return fetch(event.request).then(response => {
        // Only cache if ALL conditions are met:
        //   • valid response exists
        //   • HTTP 200 status
        //   • same-origin ("basic") — not opaque CDN response
        //   • GET request (never cache POST/PUT etc.)
        //   • it's one of the known shell assets we want cached
        const isShellAsset = SHELL_ASSETS.some(path =>
          url.endsWith(path) || url === self.location.origin + path
        );

        if (
          response &&
          response.status === 200 &&
          response.type === 'basic' &&
          event.request.method === 'GET' &&
          isShellAsset
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            console.log('Service Worker: Caching shell asset:', url);
            cache.put(event.request, clone);
          });
        }

        return response;
      }).catch(err => {
        console.error('Service Worker: Fetch failed:', url, err);
        // Optionally return a fallback offline page here
      });
    })
  );
});
