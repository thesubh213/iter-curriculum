const CACHE_NAME = 'iter-curriculum-v3';
const IMAGE_CACHE_NAME = 'iter-images-v4';

const STATIC_FILES = [
    '/',
    'index.html',
    'style.css',
    'script.js',
    'config.js',
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
    
    // Handle image requests with optimized caching
    if (event.request.destination === 'image' || url.pathname.includes('/images/')) {
        event.respondWith(
            caches.open(IMAGE_CACHE_NAME).then(async cache => {
                try {
                    // Check cache first
                    const cached = await cache.match(event.request);
                    if (cached) {
                        // Update cache in background
                        event.waitUntil(
                            fetch(event.request)
                                .then(response => {
                                    if (response.status === 200) {
                                        cache.put(event.request, response.clone());
                                    }
                                })
                                .catch(() => {})
                        );
                        return cached;
                    }
                    
                    // Fetch from network
                    const response = await fetch(event.request, { 
                        cache: 'reload',
                        headers: {
                            'Accept': 'image/webp,image/png,image/jpeg,image/*,*/*;q=0.8'
                        }
                    });
                    
                    if (response.status === 200) {
                        cache.put(event.request, response.clone());
                    }
                    return response;
                } catch (error) {
                    // Return a fallback response
                    return new Response('Image not available', { 
                        status: 404, 
                        headers: { 
                            'Content-Type': 'text/plain',
                            'Cache-Control': 'no-cache'
                        } 
                    });
                }
            })
        );
        return;
    }
    
    // Handle static files with cache-first strategy
    if (event.request.method === 'GET' && !url.pathname.includes('/images/')) {
        event.respondWith(
            caches.match(event.request)
                .then((response) => {
                    if (response) {
                        return response;
                    }
                    return fetch(event.request).then(response => {
                        // Cache successful responses for static files
                        if (response.status === 200 && response.type === 'basic') {
                            const responseToCache = response.clone();
                            caches.open(CACHE_NAME).then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                        }
                        return response;
                    });
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