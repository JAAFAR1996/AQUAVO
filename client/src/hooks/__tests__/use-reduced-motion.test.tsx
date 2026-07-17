/**
 * useReducedMotion Hook Tests
 * Verifies the shared reduced-motion hook reads the OS preference correctly,
 * reacts to live changes, and never throws when matchMedia is unavailable.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useReducedMotion, prefersReducedMotion } from '../use-reduced-motion';

describe('useReducedMotion', () => {
    const originalMatchMedia = window.matchMedia;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        window.matchMedia = originalMatchMedia;
    });

    it('returns false when the OS has no motion preference set', async () => {
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

        const { result } = renderHook(() => useReducedMotion());

        await waitFor(() => {
            expect(result.current).toBe(false);
        });
    });

    it('returns true when the OS requests reduced motion', async () => {
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

        const { result } = renderHook(() => useReducedMotion());

        await waitFor(() => {
            expect(result.current).toBe(true);
        });
    });

    it('reacts live to a change event without remounting', async () => {
        let changeHandler: ((event: MediaQueryListEvent) => void) | null = null;

        window.matchMedia = vi.fn().mockImplementation(query => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn((_event, handler) => {
                changeHandler = handler;
            }),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));

        const { result } = renderHook(() => useReducedMotion());

        await waitFor(() => {
            expect(result.current).toBe(false);
        });

        act(() => {
            changeHandler?.({ matches: true } as MediaQueryListEvent);
        });

        await waitFor(() => {
            expect(result.current).toBe(true);
        });
    });

    it('falls back to false when matchMedia is unavailable (SSR-safe)', () => {
        // @ts-expect-error simulating an environment without matchMedia
        window.matchMedia = undefined;

        const { result } = renderHook(() => useReducedMotion());
        expect(result.current).toBe(false);
    });

    it('prefersReducedMotion() one-off helper mirrors the hook result', () => {
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

        expect(prefersReducedMotion()).toBe(true);
    });
});
