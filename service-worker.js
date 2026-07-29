const CACHE_NAME = 'vg-shell-v3';

const SHELL_ASSETS = [
    '/vidhyarthi-geethavali/',
    '/vidhyarthi-geethavali/index.html',
    '/vidhyarthi-geethavali/Icon192.png',
    '/vidhyarthi-geethavali/Icon512.png',
    '/vidhyarthi-geethavali/uesisongsmain.jpg'
];

self.addEventListener('install', event => {
    console.log('[SW] Installing...');
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll(SHELL_ASSETS.map(url => new Request(url, { cache: 'reload' })));
    })());
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    console.log('[SW] Activating...');
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)));
        if (self.registration.navigationPreload) {
            await self.registration.navigationPreload.enable();
        }
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    const url = new URL(event.request.url);
    if (url.protocol === 'chrome-extension:' || url.protocol === 'moz-extension:') return;
    if (url.pathname.startsWith('/vidhyarthi-geethavali/data/') && url.pathname.endsWith('.json')) {
        event.respondWith(fetch(event.request));
        return;
    }
    if (url.origin !== location.origin) {
        event.respondWith(fetch(event.request));
        return;
    }
    const isShellAsset = SHELL_ASSETS.includes(url.pathname);
    if (isShellAsset) {
        event.respondWith((async () => {
            const cached = await caches.match(event.request);
            if (cached) {
                console.log('[SW] Cache hit:', url.pathname);
                return cached;
            }
            try {
                const preload = await event.preloadResponse;
                if (preload) return preload;
                const response = await fetch(event.request);
                if (response.ok && response.type === 'basic') {
                    const cache = await caches.open(CACHE_NAME);
                    cache.put(event.request, response.clone());
                }
                return response;
            } catch (err) {
                console.error('[SW] Fetch failed:', err);
                const fallback = await caches.match('/vidhyarthi-geethavali/index.html');
                if (fallback) return fallback;
                throw err;
            }
        })());
        return;
    }
    event.respondWith(fetch(event.request));
});
