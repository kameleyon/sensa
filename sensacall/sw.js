// Service Worker for SensaCall PWA
const CACHE_NAME = 'sensacall-v1.0.0';
const RUNTIME_CACHE = 'sensacall-runtime';
const MAX_CACHE_SIZE = 50; // Maximum number of items in runtime cache

// Assets to cache on install
const PRECACHE_ASSETS = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/manifest.json',
    '/offline.html'
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching essential assets');
                return cache.addAll(PRECACHE_ASSETS.filter(asset => {
                    // Filter out assets that don't exist yet
                    return !asset.includes('offline.html') && !asset.includes('icons/');
                }));
            })
            .then(() => self.skipWaiting())
            .catch(err => console.error('Service Worker: Cache failed', err))
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(cacheName => cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE)
                        .map(cacheName => {
                            console.log('Service Worker: Deleting old cache', cacheName);
                            return caches.delete(cacheName);
                        })
                );
            })
            .then(() => self.clients.claim())
    );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Handle API calls differently
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(handleApiRequest(request));
        return;
    }

    // Network-first strategy for HTML
    if (request.headers.get('accept').includes('text/html')) {
        event.respondWith(
            fetch(request)
                .then(response => {
                    // Clone the response before using it
                    const responseToCache = response.clone();
                    caches.open(RUNTIME_CACHE)
                        .then(cache => cache.put(request, responseToCache));
                    return response;
                })
                .catch(() => {
                    return caches.match(request)
                        .then(response => response || caches.match('/offline.html'))
                        .catch(() => createOfflineResponse());
                })
        );
        return;
    }

    // Cache-first strategy for assets
    event.respondWith(
        caches.match(request)
            .then(response => {
                if (response) {
                    return response;
                }

                return fetch(request)
                    .then(response => {
                        // Don't cache non-successful responses
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        const responseToCache = response.clone();
                        caches.open(RUNTIME_CACHE)
                            .then(cache => {
                                cache.put(request, responseToCache);
                                limitCacheSize(RUNTIME_CACHE, MAX_CACHE_SIZE);
                            });

                        return response;
                    });
            })
    );
});

// Handle API requests with offline queue
async function handleApiRequest(request) {
    try {
        const response = await fetch(request);
        return response;
    } catch (error) {
        // If offline, queue the request
        if (!navigator.onLine) {
            await queueRequest(request);
            return new Response(
                JSON.stringify({ 
                    queued: true, 
                    message: 'Request queued for when you\'re back online' 
                }),
                { 
                    headers: { 'Content-Type': 'application/json' },
                    status: 202 
                }
            );
        }
        throw error;
    }
}

// Queue requests for offline sync
async function queueRequest(request) {
    const queue = await getRequestQueue();
    const serializedRequest = await serializeRequest(request);
    queue.push(serializedRequest);
    await saveRequestQueue(queue);
}

// Serialize request for storage
async function serializeRequest(request) {
    const body = await request.text();
    return {
        url: request.url,
        method: request.method,
        headers: Object.fromEntries(request.headers.entries()),
        body: body,
        timestamp: Date.now()
    };
}

// Get request queue from IndexedDB
async function getRequestQueue() {
    // Simple implementation - in production, use IndexedDB
    const cache = await caches.open('request-queue');
    const response = await cache.match('queue');
    if (response) {
        return await response.json();
    }
    return [];
}

// Save request queue to IndexedDB
async function saveRequestQueue(queue) {
    const cache = await caches.open('request-queue');
    const response = new Response(JSON.stringify(queue));
    await cache.put('queue', response);
}

// Process queued requests when online
async function processQueue() {
    const queue = await getRequestQueue();
    const failedRequests = [];

    for (const item of queue) {
        try {
            await fetch(item.url, {
                method: item.method,
                headers: item.headers,
                body: item.body
            });
        } catch (error) {
            failedRequests.push(item);
        }
    }

    await saveRequestQueue(failedRequests);
}

// Limit cache size
async function limitCacheSize(cacheName, maxSize) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxSize) {
        await cache.delete(keys[0]);
        await limitCacheSize(cacheName, maxSize);
    }
}

// Create offline response
function createOfflineResponse() {
    return new Response(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>SensaCall - Offline</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: #0f0f23;
                    color: #ffffff;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    margin: 0;
                    padding: 20px;
                    text-align: center;
                }
                .offline-icon {
                    width: 80px;
                    height: 80px;
                    margin-bottom: 20px;
                }
                h1 {
                    font-size: 24px;
                    margin-bottom: 10px;
                }
                p {
                    color: #a0a0b8;
                    margin-bottom: 30px;
                }
                button {
                    background: #6366f1;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 24px;
                    font-size: 16px;
                    cursor: pointer;
                }
            </style>
        </head>
        <body>
            <svg class="offline-icon" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#6366f1"/>
            </svg>
            <h1>You're Offline</h1>
            <p>Please check your internet connection and try again.</p>
            <button onclick="location.reload()">Retry</button>
        </body>
        </html>
    `, {
        headers: { 'Content-Type': 'text/html' },
        status: 200
    });
}

// Listen for online event to process queue
self.addEventListener('online', () => {
    processQueue();
});

// Handle push notifications
self.addEventListener('push', (event) => {
    const options = {
        body: event.data ? event.data.text() : 'New message received',
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-72.png',
        vibrate: [200, 100, 200],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'Open',
                icon: '/icons/checkmark.png'
            },
            {
                action: 'close',
                title: 'Close',
                icon: '/icons/xmark.png'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('SensaCall', options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Handle background sync
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-messages') {
        event.waitUntil(processQueue());
    }
});

// Handle messages from clients
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => caches.delete(cacheName))
                );
            })
        );
    }
});