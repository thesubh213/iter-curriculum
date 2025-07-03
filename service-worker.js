const CACHE_VERSION = 'v2.0.0';
const CURRICULUM_IMAGE_CACHE = `curriculum-images-${CACHE_VERSION}`;
const APP_CACHE = `app-cache-${CACHE_VERSION}`;

const OLD_CACHE_PATTERNS = [
    'curriculum-images',
    'curriculum-images-v1',
    'app-cache',
    'app-cache-v1',
    'iter-curriculum',
    'static-assets'
];

function cleanupImageCache() {
    caches.open(CURRICULUM_IMAGE_CACHE).then(cache => {
        cache.keys().then(keys => {
            if (keys.length > 10) {
                const cacheInfo = keys.map(request => {
                    return cache.match(request).then(response => {
                        return {
                            request: request,
                            timestamp: response.headers.get('x-timestamp') || Date.now()
                        };
                    });
                });
                
                Promise.all(cacheInfo).then(entries => {
                    entries.sort((a, b) => a.timestamp - b.timestamp);
                    
                    const deletePromises = entries.slice(0, -10).map(entry => {
                        return cache.delete(entry.request);
                    });
                    
                    return Promise.all(deletePromises);
                });
            }
        });
    });
}

function clearOldCaches() {
    return caches.keys().then(cacheNames => {
        const deletePromises = cacheNames
            .filter(cacheName => {
                return !cacheName.includes(CACHE_VERSION);
            })
            .map(cacheName => {
                console.log('Deleting old cache:', cacheName);
                return caches.delete(cacheName);
            });
        
        return Promise.all(deletePromises);
    });
}

self.addEventListener('install', event => {
    console.log('Service Worker installing, version:', CACHE_VERSION);
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    console.log('Service Worker activating, version:', CACHE_VERSION);
    
    event.waitUntil(
        Promise.all([
            clearOldCaches(),
            self.clients.claim()
        ]).then(() => {
            console.log('Old caches cleared, new service worker active');
            
            return self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({
                        type: 'CACHE_CLEARED',
                        version: CACHE_VERSION
                    });
                });
            });
        })
    );
});

let lastCleanupTime = 0;
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; 

self.addEventListener('fetch', event => {
    const now = Date.now();
    
    if (now - lastCleanupTime > CLEANUP_INTERVAL) {
        lastCleanupTime = now;
        cleanupImageCache();
    }
    
    const url = new URL(event.request.url);
    
    if (event.request.url.includes('/images/') && 
        (event.request.url.endsWith('.webp') || event.request.url.endsWith('.jpg') || 
         event.request.url.endsWith('.png') || event.request.url.endsWith('.jpeg'))) {
        
        event.respondWith(
            caches.open(CURRICULUM_IMAGE_CACHE).then(cache => {
                return cache.match(event.request).then(response => {
                    if (response) {
                        return response;
                    }
                    
                    return fetch(event.request).then(networkResponse => {
                        if (!event.request.url.includes('/others/')) {
                            const clonedResponse = networkResponse.clone();
                            const headers = new Headers(clonedResponse.headers);
                            headers.append('x-timestamp', Date.now());
                            
                            const timestampedResponse = new Response(
                                clonedResponse.body, 
                                {
                                    status: clonedResponse.status,
                                    statusText: clonedResponse.statusText,
                                    headers: headers
                                }
                            );
                            
                            cache.put(event.request, timestampedResponse);
                        }
                        
                        return networkResponse;
                    });
                });
            })
        );
        
    } else {
        const url = new URL(event.request.url);
        const isCriticalResource = url.pathname.endsWith('.css') || 
                                  url.pathname.endsWith('.js') || 
                                  url.pathname.endsWith('.html') ||
                                  url.pathname === '/';
        
        if (isCriticalResource) {
            const cacheBustedUrl = new URL(event.request.url);
            cacheBustedUrl.searchParams.set('v', CACHE_VERSION);
            
            const cacheBustedRequest = new Request(cacheBustedUrl.toString(), {
                method: event.request.method,
                headers: event.request.headers,
                body: event.request.body,
                mode: event.request.mode,
                credentials: event.request.credentials,
                cache: 'no-cache'
            });
            
            event.respondWith(
                fetch(cacheBustedRequest)
                    .catch(error => {
                        if (event.request.headers.get('accept').includes('text/html')) {
                            return new Response(
                                `<!DOCTYPE html>
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
                                </html>`,
                                { 
                                    headers: { 'Content-Type': 'text/html' },
                                    status: 200
                                }
                            );
                        }
                        throw error;
                    })
            );
        } else {
            event.respondWith(
                fetch(event.request)
                    .catch(error => {
                        throw error;
                    })
            );
        }
    }
});
