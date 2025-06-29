const CACHE_NAME = 'iter-curriculum-v1';
const IMAGE_CACHE_NAME = 'iter-images-v1';

const STATIC_FILES = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Caching static files');
                return cache.addAll(STATIC_FILES);
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
                    return response || fetch(event.request);
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
        throw error;
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