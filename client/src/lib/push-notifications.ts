/**
 * Push Notifications utility for AQUAVO
 */

// VAPID public key (fallback — primary source is server)
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
        console.warn('This browser does not support notifications');
        return 'denied';
    }

    return await Notification.requestPermission();
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
    if (!('Notification' in window)) return 'denied';
    return Notification.permission;
}

/**
 * Convert URL-safe base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

/**
 * Get the push service worker registration
 * Uses the main service worker if it exists, otherwise registers sw-push.js
 */
async function getPushRegistration(): Promise<ServiceWorkerRegistration> {
    // Check if there's already an active service worker we can use
    const existingReg = await navigator.serviceWorker.getRegistration('/');
    if (existingReg?.active) {
        return existingReg;
    }

    // Register push service worker
    const reg = await navigator.serviceWorker.register('/sw-push.js');
    // Wait for it to be active (with timeout)
    await waitForActive(reg, 10000);
    return reg;
}

/**
 * Wait for service worker to become active with timeout
 */
function waitForActive(registration: ServiceWorkerRegistration, timeoutMs: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        if (registration.active) {
            resolve();
            return;
        }

        const timeout = setTimeout(() => {
            reject(new Error('Service worker activation timeout'));
        }, timeoutMs);

        const sw = registration.installing || registration.waiting;
        if (sw) {
            sw.addEventListener('statechange', () => {
                if (sw.state === 'activated' || sw.state === 'activating') {
                    clearTimeout(timeout);
                    resolve();
                }
            });
        } else {
            clearTimeout(timeout);
            resolve();
        }
    });
}

/**
 * Get VAPID public key — from env var first, then server
 */
async function getVapidPublicKey(): Promise<string | null> {
    // Try env var first (fast, no network)
    if (VAPID_PUBLIC_KEY) return VAPID_PUBLIC_KEY;

    // Fetch from server
    try {
        const res = await fetch('/api/notifications/vapid-key');
        if (res.ok) {
            const data = await res.json();
            return data.publicKey || null;
        }
    } catch (e) {
        console.error('Failed to fetch VAPID key from server:', e);
    }

    return null;
}

/**
 * Subscribe user to push notifications
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
    try {
        if (!isPushSupported()) {
            console.warn('Push notifications not supported');
            return null;
        }

        const permission = await requestNotificationPermission();
        if (permission !== 'granted') {
            console.warn('Notification permission denied');
            return null;
        }

        // Get VAPID key (env var → server)
        const vapidKey = await getVapidPublicKey();
        if (!vapidKey) {
            console.error('No VAPID public key available');
            return null;
        }

        // Get service worker registration (reuse existing or register new)
        const registration = await getPushRegistration();

        // Check for existing subscription first
        const existing = await registration.pushManager.getSubscription();
        if (existing) {
            // Already subscribed, just save to server
            const response = await fetch('/api/notifications/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(existing),
            });
            if (response.ok) return existing;
        }

        // Subscribe to push
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
        });

        // Send subscription to server
        const response = await fetch('/api/notifications/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(subscription),
        });

        if (!response.ok) {
            throw new Error('Failed to save subscription to server');
        }

        if (import.meta.env.DEV) {
            console.log('Push subscription successful');
        }
        return subscription;
    } catch (error) {
        console.error('Push subscription failed:', error);
        return null;
    }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
    try {
        const registration = await navigator.serviceWorker.getRegistration('/');
        if (!registration) return true;

        const subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
            return true;
        }

        // Unsubscribe
        await subscription.unsubscribe();

        // Notify server
        await fetch('/api/notifications/unsubscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ endpoint: subscription.endpoint }),
        });

        return true;
    } catch (error) {
        console.error('Unsubscribe failed:', error);
        return false;
    }
}

/**
 * Check if user is subscribed to push
 */
export async function isSubscribedToPush(): Promise<boolean> {
    try {
        if (!isPushSupported()) return false;

        const registration = await navigator.serviceWorker.getRegistration('/');
        if (!registration) return false;

        const subscription = await registration.pushManager.getSubscription();
        return !!subscription;
    } catch {
        return false;
    }
}

/**
 * Show a local notification (no server required)
 */
export async function showLocalNotification(
    title: string,
    options?: NotificationOptions
): Promise<boolean> {
    try {
        const permission = getNotificationPermission();
        if (permission !== 'granted') {
            const newPermission = await requestNotificationPermission();
            if (newPermission !== 'granted') return false;
        }

        const registration = await navigator.serviceWorker.getRegistration('/');
        if (!registration) return false;

        await registration.showNotification(title, {
            icon: '/icons/icon-192x192.png',
            badge: '/icons/badge-72x72.png',
            dir: 'rtl',
            lang: 'ar',
            ...options,
        });

        return true;
    } catch (error) {
        console.error('Failed to show notification:', error);
        return false;
    }
}
