/**
 * useIsMobile Hook Tests
 * Tests for mobile detection hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useIsMobile } from '../use-mobile';

describe('useIsMobile', () => {
    const originalMatchMedia = window.matchMedia;
    const originalInnerWidth = window.innerWidth;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        window.matchMedia = originalMatchMedia;
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            value: originalInnerWidth,
        });
    });

    it('should return false for desktop viewport', async () => {
        // Mock desktop viewport
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            value: 1024,
        });

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

        const { result } = renderHook(() => useIsMobile());

        await waitFor(() => {
            expect(result.current).toBe(false);
        });
    });

    it('should return true for mobile viewport', async () => {
        // Mock mobile viewport
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            value: 375,
        });

        window.matchMedia = vi.fn().mockImplementation(query => ({
            matches: true,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));

        const { result } = renderHook(() => useIsMobile());

        await waitFor(() => {
            expect(result.current).toBe(true);
        });
    });

    it('should use 768px as breakpoint', async () => {
        // Test at exactly 768px (should be desktop)
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            value: 768,
        });

        window.matchMedia = vi.fn().mockImplementation(query => ({
            matches: false, // 768px is not < 768
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));

        const { result } = renderHook(() => useIsMobile());

        await waitFor(() => {
            expect(result.current).toBe(false);
        });
    });

    it('should handle viewport just below breakpoint', async () => {
        // Test at 767px (should be mobile)
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            value: 767,
        });

        window.matchMedia = vi.fn().mockImplementation(query => ({
            matches: true, // 767px < 768
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));

        const { result } = renderHook(() => useIsMobile());

        await waitFor(() => {
            expect(result.current).toBe(true);
        });
    });
});
