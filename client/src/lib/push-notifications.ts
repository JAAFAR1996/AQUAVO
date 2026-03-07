/**
 * Push Notifications utility for AQUAVO
 */

// VAPID public key (generate your own in production)
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
 * Get VAPID public key — from server first, then env var fallback
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

        // Get VAPID key (server → env var)
        const vapidKey = await getVapidPublicKey();
        if (!vapidKey) {
            console.error('No VAPID public key available');
            return null;
        }

        // Register service worker
        const registration = await navigator.serviceWorker.register('/sw-push.js');
        await navigator.serviceWorker.ready;

        // Subscribe to push
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as ArrayBuffer,
        });

        // Send subscription to server
        const response = await fetch('/api/notifications/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(subscription),
        });

        if (!response.ok) {
            throw new Error('Failed to save subscription');
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
        const registration = await navigator.serviceWorker.ready;
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

        const registration = await navigator.serviceWorker.ready;
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

        const registration = await navigator.serviceWorker.ready;
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
