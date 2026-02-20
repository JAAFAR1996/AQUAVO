// Push Notifications Service Worker

self.addEventListener('push', function (event) {
    if (!event.data) return;

    const data = event.data.json();

    const options = {
        body: data.body || 'لديك إشعار جديد',
        icon: data.icon || '/icons/icon-192x192.png',
        badge: data.badge || '/icons/badge-72x72.png',
        image: data.image,
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/',
            dateOfArrival: Date.now(),
            primaryKey: data.primaryKey || 1,
        },
        actions: data.actions || [
            { action: 'open', title: 'فتح' },
            { action: 'close', title: 'إغلاق' },
        ],
        dir: 'rtl',
        lang: 'ar',
        tag: data.tag || 'aquavo-notification',
        renotify: true,
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'AQUAVO', options)
    );
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();

    if (event.action === 'close') return;

    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            for (const client of clientList) {
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

self.addEventListener('pushsubscriptionchange', function (event) {
    // Notify all open clients to resubscribe (they have access to the VAPID key)
    event.waitUntil(
        self.clients.matchAll({ type: 'window' }).then(function (clientList) {
            return Promise.all(
                clientList.map(function (client) {
                    return client.postMessage({ type: 'PUSH_RESUBSCRIBE' });
                })
            );
        })
    );
});
