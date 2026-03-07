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
 * Get VAPID public key — from env var first, then server
 */
async function getVapidPublicKey(): Promise<string> {
    // Try env var first (fast, no network)
    if (VAPID_PUBLIC_KEY) return VAPID_PUBLIC_KEY;

    // Fetch from server
    const res = await fetch('/api/notifications/vapid-key');
    if (!res.ok) {
        throw new Error(`VAPID key fetch failed: ${res.status}`);
    }
    const data = await res.json();
    if (!data.publicKey) {
        throw new Error('Server returned empty VAPID key');
    }
    return data.publicKey;
}

/**
 * Subscribe user to push notifications
 * Throws detailed errors so UI can show exactly what failed
 */
export async function subscribeToPush(): Promise<PushSubscription> {
    // Step 1: Check support
    if (!isPushSupported()) {
        throw new Error('STEP1_NOT_SUPPORTED: المتصفح لا يدعم الإشعارات');
    }

    // Step 2: Request permission
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
        throw new Error(`STEP2_PERMISSION: صلاحية الإشعارات: ${permission}`);
    }

    // Step 3: Get VAPID key
    let vapidKey: string;
    try {
        vapidKey = await getVapidPublicKey();
    } catch (e) {
        throw new Error(`STEP3_VAPID: فشل جلب مفتاح VAPID - ${e instanceof Error ? e.message : e}`);
    }

    // Step 4: Register service worker
    let registration: ServiceWorkerRegistration;
    try {
        registration = await navigator.serviceWorker.register('/sw-push.js');
    } catch (e) {
        throw new Error(`STEP4_SW_REGISTER: فشل تسجيل Service Worker - ${e instanceof Error ? e.message : e}`);
    }

    // Step 5: Wait for SW to be ready
    try {
        if (!registration.active) {
            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('timeout 15s')), 15000);
                const sw = registration.installing || registration.waiting || registration.active;
                if (!sw) {
                    clearTimeout(timeout);
                    resolve(); // No worker to wait for
                    return;
                }
                if (sw.state === 'activated') {
                    clearTimeout(timeout);
                    resolve();
                    return;
                }
                sw.addEventListener('statechange', () => {
                    if (sw.state === 'activated') {
                        clearTimeout(timeout);
                        resolve();
                    }
                    if (sw.state === 'redundant') {
                        clearTimeout(timeout);
                        reject(new Error('SW became redundant'));
                    }
                });
            });
        }
    } catch (e) {
        throw new Error(`STEP5_SW_ACTIVATE: Service Worker لم يتفعل - ${e instanceof Error ? e.message : e}`);
    }

    // Step 6: Subscribe to push manager
    let subscription: PushSubscription;
    try {
        // Check for existing subscription first
        const existing = await registration.pushManager.getSubscription();
        if (existing) {
            subscription = existing;
        } else {
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as BufferSource,
            });
        }
    } catch (e) {
        throw new Error(`STEP6_PUSH_SUBSCRIBE: فشل الاشتراك - ${e instanceof Error ? e.message : e}`);
    }

    // Step 7: Save to server
    try {
        const response = await fetch('/api/notifications/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(subscription),
        });

        if (!response.ok) {
            const text = await response.text().catch(() => '');
            throw new Error(`Server ${response.status}: ${text.slice(0, 100)}`);
        }
    } catch (e) {
        throw new Error(`STEP7_SAVE: فشل حفظ الاشتراك - ${e instanceof Error ? e.message : e}`);
    }

    return subscription;
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
