/**
 * usePWA Hook Tests
 * Tests for Progressive Web App functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePWA, requestNotificationPermission } from '../use-pwa';

describe('usePWA', () => {
    const originalMatchMedia = window.matchMedia;
    const originalNavigator = { ...navigator };

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock matchMedia for display-mode check
        window.matchMedia = vi.fn().mockImplementation(query => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));

        // Mock navigator.serviceWorker
        Object.defineProperty(navigator, 'serviceWorker', {
            value: {
                register: vi.fn().mockResolvedValue({
                    installing: null,
                    waiting: null,
                    active: null,
                    addEventListener: vi.fn(),
                }),
                ready: Promise.resolve({
                    pushManager: {
                        subscribe: vi.fn(),
                    },
                }),
                controller: null,
            },
            writable: true,
            configurable: true,
        });

        // Mock navigator.onLine
        Object.defineProperty(navigator, 'onLine', {
            value: true,
            writable: true,
            configurable: true,
        });
    });

    afterEach(() => {
        window.matchMedia = originalMatchMedia;
        vi.restoreAllMocks();
    });

    describe('Initial State', () => {
        it('should start with default values', () => {
            const { result } = renderHook(() => usePWA());

            expect(result.current.isInstallable).toBe(false);
            expect(result.current.isInstalled).toBe(false);
            expect(result.current.isOnline).toBe(true);
            expect(result.current.updateAvailable).toBe(false);
        });

        it('should detect standalone mode as installed', () => {
            window.matchMedia = vi.fn().mockImplementation(query => ({
                matches: query.includes('standalone'),
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            }));

            const { result } = renderHook(() => usePWA());

            expect(result.current.isInstalled).toBe(true);
        });
    });

    describe('Online/Offline Detection', () => {
        it('should update isOnline when going offline', async () => {
            const { result } = renderHook(() => usePWA());

            expect(result.current.isOnline).toBe(true);

            // Simulate going offline
            act(() => {
                Object.defineProperty(navigator, 'onLine', {
                    value: false,
                    writable: true,
                    configurable: true,
                });
                window.dispatchEvent(new Event('offline'));
            });

            await waitFor(() => {
                expect(result.current.isOnline).toBe(false);
            });
        });

        it('should update isOnline when coming back online', async () => {
            // Start offline
            Object.defineProperty(navigator, 'onLine', {
                value: false,
                writable: true,
                configurable: true,
            });

            const { result } = renderHook(() => usePWA());

            // Simulate coming online
            act(() => {
                Object.defineProperty(navigator, 'onLine', {
                    value: true,
                    writable: true,
                    configurable: true,
                });
                window.dispatchEvent(new Event('online'));
            });

            await waitFor(() => {
                expect(result.current.isOnline).toBe(true);
            });
        });
    });

    describe('Service Worker', () => {
        it('should register service worker on mount', async () => {
            renderHook(() => usePWA());

            await waitFor(() => {
                expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js');
            });
        });
    });

    describe('promptInstall', () => {
        it('should be a function', () => {
            const { result } = renderHook(() => usePWA());
            expect(typeof result.current.promptInstall).toBe('function');
        });

        it('should do nothing if no deferred prompt', async () => {
            const { result } = renderHook(() => usePWA());

            // Should not throw
            await act(async () => {
                await result.current.promptInstall();
            });
        });
    });

    describe('updateApp', () => {
        it('should be a function', () => {
            const { result } = renderHook(() => usePWA());
            expect(typeof result.current.updateApp).toBe('function');
        });
    });
});

describe('requestNotificationPermission', () => {
    const originalNotification = global.Notification;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        global.Notification = originalNotification;
    });

    it('should return false if Notification API not supported', async () => {
        // @ts-ignore - Removing Notification for test
        delete global.Notification;

        const result = await requestNotificationPermission();
        expect(result).toBe(false);
    });

    it('should return true if permission already granted', async () => {
        global.Notification = {
            permission: 'granted',
            requestPermission: vi.fn(),
        } as unknown as typeof Notification;

        const result = await requestNotificationPermission();
        expect(result).toBe(true);
    });

    it('should return false if permission denied', async () => {
        global.Notification = {
            permission: 'denied',
            requestPermission: vi.fn(),
        } as unknown as typeof Notification;

        const result = await requestNotificationPermission();
        expect(result).toBe(false);
    });

    it('should request permission if not decided', async () => {
        const mockRequestPermission = vi.fn().mockResolvedValue('granted');
        global.Notification = {
            permission: 'default',
            requestPermission: mockRequestPermission,
        } as unknown as typeof Notification;

        const result = await requestNotificationPermission();

        expect(mockRequestPermission).toHaveBeenCalled();
        expect(result).toBe(true);
    });
});
