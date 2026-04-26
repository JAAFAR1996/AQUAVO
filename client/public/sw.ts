/// <reference lib="webworker" />

const CACHE_NAME = 'aquavo-v1';
const STATIC_CACHE = 'aquavo-static-v1';
const IMAGE_CACHE = 'aquavo-images-v1';
const API_CACHE = 'aquavo-api-v1';

// Static assets to pre-cache
const STATIC_ASSETS = [
    '/',
    '/offline.html',
    '/manifest.json',
];

// Install event - cache static assets
self.addEventListener('install', (event: ExtendableEvent) => {
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    // Activate immediately
    (self as any).skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event: ExtendableEvent) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => {
                        return name.startsWith('aquavo-') &&
                            name !== CACHE_NAME &&
                            name !== STATIC_CACHE &&
                            name !== IMAGE_CACHE &&
                            name !== API_CACHE;
                    })
                    .map((name) => caches.delete(name))
            );
        })
    );
    // Take control of all pages immediately
    (self as any).clients.claim();
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event: FetchEvent) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip chrome-extension and other non-http(s) requests
    if (!url.protocol.startsWith('http')) return;

    // API calls - Network first, fallback to cache
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(networkFirst(request, API_CACHE));
        return;
    }

    // Images - Cache first, fallback to network
    if (isImageRequest(request)) {
        event.respondWith(cacheFirst(request, IMAGE_CACHE));
        return;
    }

    // Static assets - Cache first
    if (isStaticAsset(url.pathname)) {
        event.respondWith(cacheFirst(request, STATIC_CACHE));
        return;
    }

    // HTML pages - Stale while revalidate
    if (request.headers.get('accept')?.includes('text/html')) {
        event.respondWith(staleWhileRevalidate(request, CACHE_NAME));
        return;
    }

    // Default - Network first
    event.respondWith(networkFirst(request, CACHE_NAME));
});

// Network first strategy
async function networkFirst(request: Request, cacheName: string): Promise<Response> {
    try {
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) return cachedResponse;

        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
            const offlinePage = await caches.match('/offline.html');
            if (offlinePage) return offlinePage;
        }

        throw error;
    }
}

// Cache first strategy
async function cacheFirst(request: Request, cacheName: string): Promise<Response> {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;

    try {
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        // Return a placeholder for images
        if (isImageRequest(request)) {
            return new Response('', { status: 404, statusText: 'Not Found' });
        }
        throw error;
    }
}

// Stale while revalidate strategy
async function staleWhileRevalidate(request: Request, cacheName: string): Promise<Response> {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    }).catch(() => cachedResponse);

    return cachedResponse || fetchPromise;
}

// Helper functions
function isImageRequest(request: Request): boolean {
    const url = new URL(request.url);
    return (
        request.destination === 'image' ||
        /\.(png|jpg|jpeg|gif|webp|svg|ico)$/i.test(url.pathname)
    );
}

function isStaticAsset(pathname: string): boolean {
    return /\.(css|js|woff|woff2|ttf|eot)$/i.test(pathname) ||
        pathname.startsWith('/assets/');
}

// Background sync for cart
self.addEventListener('sync', (event: any) => {
    if (event.tag === 'sync-cart') {
        event.waitUntil(syncCart());
    }
});

async function syncCart(): Promise<void> {
    try {
        const cart = await getStoredCart();
        if (cart && cart.length > 0) {
            // Sync cart with server when back online
            await fetch('/api/cart/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: cart }),
                credentials: 'include',
            });
        }
    } catch (error) {
        console.error('Cart sync failed:', error);
    }
}

async function getStoredCart(): Promise<any[]> {
    // This would be implemented with IndexedDB in production
    return [];
}

// Push notifications
self.addEventListener('push', (event: PushEvent) => {
    const data = event.data?.json() || {};

    const options: NotificationOptions = {
        body: data.body || 'لديك إشعار جديد',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/',
            id: data.id,
        },
        actions: data.actions || [],
        dir: 'rtl',
        lang: 'ar',
    };

    event.waitUntil(
        (self as any).registration.showNotification(
            data.title || 'AQUAVO',
            options
        )
    );
});

// Notification click handler
self.addEventListener('notificationclick', (event: NotificationEvent) => {
    event.notification.close();

    const data = event.notification.data || {};
    const url = data.url || '/';
    const notificationId = data.id; // Passed from backend push payload

    // Call API to track the click in the background
    if (notificationId) {
        event.waitUntil(
            fetch(`/api/notifications/track-click/${notificationId}`, { method: 'POST' })
                .catch(err => console.error('Failed to track click:', err))
        );
    }

    event.waitUntil(
        (self as any).clients.matchAll({ type: 'window' }).then((clients: any[]) => {
            // Focus existing window if available
            for (const client of clients) {
                if (client.url === url && 'focus' in client) {
                    return client.focus();
                }
            }
            // Open new window
            if ((self as any).clients.openWindow) {
                return (self as any).clients.openWindow(url);
            }
        })
    );
});

export { };
