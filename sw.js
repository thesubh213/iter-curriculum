const CACHE_NAME = 'iter-curriculum-v2';
const IMAGE_CACHE_NAME = 'iter-images-v2';

const STATIC_FILES = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Caching static files');
                return cache.addAll(STATIC_FILES).catch(error => {
                    console.warn('Some files failed to cache:', error);
                });
            })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME && cacheName !== IMAGE_CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
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
        event.respondWith(handleImageRequest(event.request));
        return;
    }
    
    if (event.request.method === 'GET') {
        event.respondWith(
            caches.match(event.request)
                .then((response) => {
                    return response || fetch(event.request).catch(() => {
                        if (event.request.destination === 'document') {
                            return caches.match('/index.html');
                        }
                        return new Response('Not found', { status: 404 });
                    });
                })
        );
    }
});

async function handleImageRequest(request) {
    const imageCache = await caches.open(IMAGE_CACHE_NAME);
    
    const cachedResponse = await imageCache.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            imageCache.put(request, responseToCache);
        }
        
        return networkResponse;
    } catch (error) {
        console.error('Failed to fetch image:', error);
        return new Response('Image not available', { 
            status: 404,
            headers: { 'Content-Type': 'text/plain' }
        });
    }
}

self.addEventListener('sync', (event) => {
    if (event.tag === 'preload-images') {
        event.waitUntil(preloadImages());
    }
});

async function preloadImages() {
    console.log('Background image preloading');
} 