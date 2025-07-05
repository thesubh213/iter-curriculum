const CACHE_NAME = 'iter-curriculum-v2';
const STATIC_CACHE = 'iter-static-v2';
const IMAGE_CACHE = 'iter-images-v2';

const staticUrlsToCache = [
    '/',
    '/index.html',
    '/styles.css',
    '/script.js',
    '/manifest.webmanifest',
    '/favicon.ico'
];

self.addEventListener('install', event => {
    console.log('Service Worker installing...');
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('Opened static cache');
                return cache.addAll(staticUrlsToCache);
            })
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    console.log('Service Worker activating...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== STATIC_CACHE && cacheName !== IMAGE_CACHE) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const requestUrl = new URL(event.request.url);
    
    if (staticUrlsToCache.some(url => requestUrl.pathname === url || requestUrl.pathname === url.slice(1))) {
        event.respondWith(
            caches.match(event.request).then(response => {
                return response || fetch(event.request);
            })
        );
        return;
    }
    
    if (event.request.url.includes('images/') && event.request.url.includes('-sem')) {
        event.respondWith(
            caches.open(IMAGE_CACHE).then(cache => {
                return cache.match(event.request).then(response => {
                    if (response) {
                        console.log('Serving curriculum image from cache:', event.request.url);
                        return response;
                    }
                    
                    return fetch(event.request).then(fetchResponse => {
                        if (fetchResponse && fetchResponse.status === 200) {
                            if (event.request.url.includes('-sem') && !event.request.url.match(/-\d+\.webp$/)) {
                                console.log('Caching curriculum image:', event.request.url);
                                cache.put(event.request, fetchResponse.clone());
                            }
                        }
                        return fetchResponse;
                    }).catch(() => {
                        return new Response('Image not available offline', {
                            status: 404,
                            statusText: 'Not Found'
                        });
                    });
                });
            })
        );
        return;
    }
    
    if (event.request.url.includes('images/') && !event.request.url.includes('-sem')) {
        event.respondWith(
            fetch(event.request).catch(() => {
                return new Response('Additional resource not available offline', {
                    status: 404,
                    statusText: 'Not Found'
                });
            })
        );
        return;
    }
    
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});

self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CACHE_CURRENT_IMAGE') {
        const imagePath = event.data.path;
        
        if (imagePath && imagePath.includes('-sem')) {
            caches.open(IMAGE_CACHE).then(cache => {
                fetch(imagePath).then(response => {
                    if (response && response.status === 200) {
                        console.log('Background caching current image:', imagePath);
                        cache.put(imagePath, response.clone());
                    }
                }).catch(() => {
                });
            });
        }
    }
    
    if (event.data && event.data.type === 'CLEAR_IMAGE_CACHE') {
        caches.delete(IMAGE_CACHE).then(() => {
            console.log('Cleared image cache');
        });
    }
});

self.addEventListener('error', event => {
    console.error('Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', event => {
    console.error('Service Worker unhandled rejection:', event.reason);
});

console.log('Service Worker loaded successfully');
