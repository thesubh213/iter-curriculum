const CACHE_NAME = 'iter-curriculum-v2';
const IMAGE_CACHE_NAME = 'iter-images-v3';

const STATIC_FILES = [
    '/',
    'index.html',
    'style.css',
    'script.js',
    'manifest.json'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(STATIC_FILES);
            })
            .catch((error) => {
                // Some files failed to cache silently
            })
    );
});

self.addEventListener('activate', (event) => {
    self.clients.claim();
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME && cacheName !== IMAGE_CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    if (event.request.destination === 'image' || url.pathname.includes('/images/')) {
        event.respondWith(
            caches.open(IMAGE_CACHE_NAME).then(async cache => {
                const cached = await cache.match(event.request);
                if (cached) {
                    event.waitUntil(fetch(event.request).then(response => {
                        if (response.status === 200) cache.put(event.request, response.clone());
                    }).catch(() => {}));
                    return cached;
                }
                try {
                    const response = await fetch(event.request, { cache: 'reload' });
                    if (response.status === 200) cache.put(event.request, response.clone());
                    return response;
                } catch {
                    return new Response('Image not available', { status: 404, headers: { 'Content-Type': 'text/plain' } });
                }
            })
        );
        return;
    }
    
    if (event.request.method === 'GET') {
        event.respondWith(
            caches.match(event.request)
                .then((response) => {
                    return response || fetch(event.request);
                })
        );
    }
});

self.addEventListener('sync', (event) => {
    if (event.tag === 'preload-images') {
        event.waitUntil(preloadImages());
    }
});

async function preloadImages() {
} 