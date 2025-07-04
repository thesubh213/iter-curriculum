const CACHE_VERSION = 'v2.0.0';
const CURRICULUM_IMAGE_CACHE = `curriculum-images-${CACHE_VERSION}`;
const APP_CACHE = `app-cache-${CACHE_VERSION}`;
const IMAGE_PATHS_CACHE = `image-paths-${CACHE_VERSION}`;

const MAX_CURRENT_IMAGES = 1; 
const MAX_PATH_CACHE_ENTRIES = 100;
const CLEANUP_INTERVAL = 10 * 60 * 1000;

const OLD_CACHE_PATTERNS = [
    'curriculum-images',
    'curriculum-images-v1',
    'app-cache',
    'app-cache-v1',
    'iter-curriculum',
    'static-assets',
    'critical-images',
    'image-paths'
];

const IMAGE_EXTENSIONS = ['.webp', '.jpg', '.png', '.jpeg'];

const CRITICAL_PATTERNS = ['.css', '.js', '.html'];

let lastCleanupTime = 0;

async function cleanupCurrentImageCache() {
    try {
        const cache = await caches.open(CURRICULUM_IMAGE_CACHE);
        const keys = await cache.keys();
        
        if (keys.length <= MAX_CURRENT_IMAGES) return;
        
        const cacheInfo = await Promise.all(
            keys.map(async request => {
                const response = await cache.match(request);
                return {
                    request,
                    timestamp: parseInt(response?.headers.get('x-timestamp')) || 0
                };
            })
        );
        
        cacheInfo.sort((a, b) => b.timestamp - a.timestamp);
        
        const deletePromises = cacheInfo
            .slice(MAX_CURRENT_IMAGES)
            .map(entry => {
                console.log('🗑️ Removing old cached image:', entry.request.url);
                return cache.delete(entry.request);
            });
        
        await Promise.all(deletePromises);
    } catch (error) {
        console.error('Error cleaning current image cache:', error);
    }
}

async function cleanupImagePathsCache() {
    try {
        const cache = await caches.open(IMAGE_PATHS_CACHE);
        const keys = await cache.keys();
        
        if (keys.length <= MAX_PATH_CACHE_ENTRIES) return;
        
        const cacheInfo = await Promise.all(
            keys.map(async request => {
                const response = await cache.match(request);
                return {
                    request,
                    timestamp: parseInt(response?.headers.get('x-timestamp')) || 0
                };
            })
        );
        
        cacheInfo.sort((a, b) => a.timestamp - b.timestamp);
        
        const deletePromises = cacheInfo
            .slice(0, -(MAX_PATH_CACHE_ENTRIES - 20))
            .map(entry => cache.delete(entry.request));
        
        await Promise.all(deletePromises);
    } catch (error) {
        console.error('Error cleaning image paths cache:', error);
    }
}

async function clearOldCaches() {
    try {
        const cacheNames = await caches.keys();
        const deletePromises = cacheNames
            .filter(cacheName => !cacheName.includes(CACHE_VERSION))
            .map(cacheName => {
                console.log('Deleting old cache:', cacheName);
                return caches.delete(cacheName);
            });
        
        await Promise.all(deletePromises);
    } catch (error) {
        console.error('Error clearing old caches:', error);
    }
}

self.addEventListener('install', event => {
    console.log('Service Worker installing, version:', CACHE_VERSION);
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    console.log('Service Worker activating, version:', CACHE_VERSION);
    
    event.waitUntil(
        (async () => {
            try {
                await clearOldCaches();
                await self.clients.claim();
                
                console.log('Old caches cleared, new service worker active');
                
                const clients = await self.clients.matchAll();
                clients.forEach(client => {
                    client.postMessage({
                        type: 'CACHE_CLEARED',
                        version: CACHE_VERSION
                    });
                });
            } catch (error) {
                console.error('Error during service worker activation:', error);
            }
        })()
    );
});

self.addEventListener('fetch', event => {
    const now = Date.now();
    
    if (now - lastCleanupTime > CLEANUP_INTERVAL) {
        lastCleanupTime = now;
        cleanupCurrentImageCache();
        cleanupImagePathsCache();
    }
    
    const url = new URL(event.request.url);
    const isImageRequest = event.request.url.includes('/images/') && 
        IMAGE_EXTENSIONS.some(ext => event.request.url.endsWith(ext));
    
    if (isImageRequest) {
        event.respondWith(handleEfficientImageRequest(event.request));
        return;
    }
    
    const isCriticalResource = CRITICAL_PATTERNS.some(pattern => url.pathname.endsWith(pattern)) || 
                              url.pathname === '/';
    
    if (isCriticalResource) {
        event.respondWith(handleCriticalResource(event.request));
    } else {
        event.respondWith(handleRegularResource(event.request));
    }
});

async function handleCriticalResource(request) {
    const cacheBustedUrl = new URL(request.url);
    cacheBustedUrl.searchParams.set('v', CACHE_VERSION);
    
    const cacheBustedRequest = new Request(cacheBustedUrl.toString(), {
        method: request.method,
        headers: request.headers,
        body: request.body,
        mode: request.mode,
        credentials: request.credentials,
        cache: 'no-cache'
    });
    
    try {
        return await fetch(cacheBustedRequest);
    } catch (error) {
        if (request.headers.get('accept')?.includes('text/html')) {
            return createOfflinePage();
        }
        throw error;
    }
}

async function handleRegularResource(request) {
    try {
        return await fetch(request);
    } catch (error) {
        throw error;
    }
}

function createOfflinePage() {
    const offlineHTML = `<!DOCTYPE html>
        <html>
        <head>
            <title>ITER Curriculum - Offline</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
                .offline-message { background: white; padding: 40px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
                h1 { color: #6B8E78; margin-bottom: 20px; }
                p { color: #666; line-height: 1.6; }
                .retry-btn { background: #6B8E78; color: white; padding: 12px 24px; border: none; border-radius: 8px; margin-top: 20px; cursor: pointer; }
            </style>
        </head>
        <body>
            <div class="offline-message">
                <h1>You're Offline</h1>
                <p>ITER Curriculum Viewer needs an internet connection to load the latest content.</p>
                <p>Please check your connection and try again.</p>
                <button class="retry-btn" onclick="window.location.reload()">Retry</button>
            </div>
        </body>
        </html>`;
    
    return new Response(offlineHTML, { 
        headers: { 'Content-Type': 'text/html' },
        status: 200
    });
}

async function handleEfficientImageRequest(request) {
    const imageCache = await caches.open(CURRICULUM_IMAGE_CACHE);
    
    let response = await imageCache.match(request);
    if (response) {
        console.log('⚡ Cache hit (Current Image):', request.url);
        return response;
    }
    
    try {
        console.log('🌐 Fetching new image:', request.url);
        const networkResponse = await fetch(request, {
            cache: 'force-cache'
        });
        
        if (networkResponse.ok) {
            await clearOldImagesFromCache(imageCache);
            
            await cacheCurrentImage(imageCache, request, networkResponse.clone());
            
            console.log('💾 Cached new current image:', request.url);
        }
        
        return networkResponse;
    } catch (error) {
        console.log('❌ Network error for image:', request.url);
        throw error;
    }
}

async function clearOldImagesFromCache(cache) {
    const keys = await cache.keys();
    const deletePromises = keys.map(request => {
        console.log('🗑️ Removing old image from cache:', request.url);
        return cache.delete(request);
    });
    await Promise.all(deletePromises);
}

async function cacheCurrentImage(cache, request, response) {
    const headers = new Headers(response.headers);
    headers.set('x-timestamp', Date.now().toString());
    headers.set('x-current-image', 'true');
    
    const cachedResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: headers
    });
    
    await cache.put(request, cachedResponse);
}

async function cacheImagePaths(paths) {
    const pathsCache = await caches.open(IMAGE_PATHS_CACHE);
    const pathsData = {
        paths: paths,
        timestamp: Date.now(),
        version: CACHE_VERSION
    };
    
    const response = new Response(JSON.stringify(pathsData), {
        headers: {
            'Content-Type': 'application/json',
            'x-timestamp': Date.now().toString()
        }
    });
    
    await pathsCache.put('image-paths-data', response);
    console.log('📁 Cached image paths:', paths.length, 'paths');
}

async function getCachedImagePaths() {
    try {
        const pathsCache = await caches.open(IMAGE_PATHS_CACHE);
        const response = await pathsCache.match('image-paths-data');
        
        if (response) {
            const data = await response.json();
            if (data.version === CACHE_VERSION) {
                console.log('📁 Using cached image paths:', data.paths.length, 'paths');
                return data.paths;
            }
        }
    } catch (error) {
        console.log('Error getting cached paths:', error);
    }
    return null;
}

self.addEventListener('message', event => {
    const { data } = event;
    if (!data) return;
    
    switch (data.type) {
        case 'CACHE_IMAGE_PATHS':
            const paths = data.paths || [];
            cacheImagePaths(paths);
            break;
            
        case 'GET_CACHED_PATHS':
            getCachedImagePaths().then(paths => {
                event.ports[0].postMessage({
                    type: 'CACHED_PATHS_RESPONSE',
                    paths: paths
                });
            });
            break;
    }
});
