/**
 * Service Worker for offline support and caching
 * Improves performance by caching static assets
 */

const CACHE_VERSION = 'woman-safety-v1';
const CRITICAL_ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/js/emergency-handler.js',
    '/js/acoustic-detector.js',
    '/js/voice-trigger.js',
    '/js/ai-guardian.js',
    '/js/processor.js',
    '/js/performance-optimizer.js'
];

// Install Service Worker
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_VERSION).then((cache) => {
            console.log('Service Worker: Caching critical assets');
            return cache.addAll(CRITICAL_ASSETS).catch((error) => {
                console.warn('Service Worker: Failed to cache some assets', error);
            });
        })
    );
    self.skipWaiting();
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_VERSION) {
                        console.log('Service Worker: Deleting old cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch Event - Network-first strategy with cache fallback
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip cross-origin requests
    if (url.origin !== self.location.origin) {
        // For CDN resources, use cache-first strategy
        if (url.hostname.includes('cdn.jsdelivr.net') || url.hostname.includes('tfhub.dev')) {
            event.respondWith(
                caches.match(request).then((cachedResponse) => {
                    return cachedResponse || fetch(request).then((response) => {
                        // Cache successful responses
                        if (response.ok) {
                            const cache$ = caches.open(CACHE_VERSION);
                            cache$.then((cache) => cache.put(request, response.clone()));
                        }
                        return response;
                    });
                }).catch(() => {
                    return new Response('Network error', { status: 503 });
                })
            );
        }
        return;
    }

    // For HTML pages and API calls, use network-first strategy
    if (url.pathname.endsWith('.html') || url.pathname.includes('/api/')) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (!response.ok) {
                        return caches.match(request);
                    }
                    const cache$ = caches.open(CACHE_VERSION);
                    cache$.then((cache) => cache.put(request, response.clone()));
                    return response;
                })
                .catch(() => {
                    return caches.match(request).then((cachedResponse) => {
                        return cachedResponse || new Response('Offline', { status: 503 });
                    });
                })
        );
        return;
    }

    // For static assets (CSS, JS, images), use cache-first strategy
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(request).then((response) => {
                if (!response.ok) {
                    return response;
                }

                const cache$ = caches.open(CACHE_VERSION);
                cache$.then((cache) => cache.put(request, response.clone()));
                return response;
            }).catch(() => {
                return new Response('Asset not available', { status: 503 });
            });
        })
    );
});

// Background sync for emergency alerts (future feature)
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-emergency-alerts') {
        event.waitUntil(
            // Implement emergency alert sync logic here
            Promise.resolve()
        );
    }
});

console.log('Service Worker installed and ready');
