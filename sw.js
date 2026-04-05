const CACHE_NAME = 'nexus-ai-pwa-v4';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './avatar.png',
    './manifest.json'
];

self.addEventListener('install', event => {
    self.skipWaiting(); // Force new service worker to activate immediately
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Take over all pages immediately
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        }).catch(() => {
            // Offline fallback
            return caches.match('./index.html');
        })
    );
});
