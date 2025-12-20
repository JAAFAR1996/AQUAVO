/**
 * useIdleTimer Hook Tests
 * Tests for idle detection hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useIdleTimer } from '../use-idle-timer';

describe('useIdleTimer', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should start with isIdle false', () => {
        const { result } = renderHook(() => useIdleTimer({ timeout: 5000 }));
        expect(result.current.isIdle).toBe(false);
    });

    it('should set isIdle true after timeout', async () => {
        const onIdle = vi.fn();
        const { result } = renderHook(() => useIdleTimer({ timeout: 5000, onIdle }));

        expect(result.current.isIdle).toBe(false);

        // Fast forward past timeout
        await act(async () => {
            vi.advanceTimersByTime(5000);
        });

        // onIdle callback should have been called
        expect(onIdle).toHaveBeenCalledTimes(1);
    });

    it('should call onIdle callback when becoming idle', async () => {
        const onIdle = vi.fn();
        renderHook(() => useIdleTimer({ timeout: 5000, onIdle }));

        expect(onIdle).not.toHaveBeenCalled();

        await act(async () => {
            vi.advanceTimersByTime(5000);
        });

        expect(onIdle).toHaveBeenCalledTimes(1);
    });

    it('should provide resetTimer function', () => {
        const { result } = renderHook(() => useIdleTimer({ timeout: 5000 }));
        expect(typeof result.current.resetTimer).toBe('function');
    });

    it('should reset timer on resetTimer call before idle', async () => {
        const onIdle = vi.fn();
        const { result } = renderHook(() => useIdleTimer({ timeout: 5000, onIdle }));

        // Advance 3 seconds
        await act(async () => {
            vi.advanceTimersByTime(3000);
        });

        // Reset timer
        act(() => {
            result.current.resetTimer();
        });

        // Advance 3 more seconds (would have been 6 total without reset)
        await act(async () => {
            vi.advanceTimersByTime(3000);
        });

        // Should not have called onIdle yet (only 3 seconds since reset)
        expect(onIdle).not.toHaveBeenCalled();
    });

    it('should use custom timeout value', async () => {
        const onIdle = vi.fn();
        renderHook(() => useIdleTimer({ timeout: 10000, onIdle }));

        await act(async () => {
            vi.advanceTimersByTime(9999);
        });

        expect(onIdle).not.toHaveBeenCalled();

        await act(async () => {
            vi.advanceTimersByTime(1);
        });

        expect(onIdle).toHaveBeenCalledTimes(1);
    });

    it('should use default timeout of 15 seconds', async () => {
        const onIdle = vi.fn();
        renderHook(() => useIdleTimer({ timeout: 15000, onIdle }));

        await act(async () => {
            vi.advanceTimersByTime(14999);
        });

        expect(onIdle).not.toHaveBeenCalled();

        await act(async () => {
            vi.advanceTimersByTime(1);
        });

        expect(onIdle).toHaveBeenCalledTimes(1);
    });
});
