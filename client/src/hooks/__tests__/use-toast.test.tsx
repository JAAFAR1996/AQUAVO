import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToast, toast } from '../use-toast';

describe('useToast', () => {
    beforeEach(() => {
        // Clear any existing toasts before each test
        vi.clearAllMocks();
    });

    it('should return expected structure', () => {
        const { result } = renderHook(() => useToast());

        expect(result.current).toHaveProperty('toasts');
        expect(result.current).toHaveProperty('toast');
        expect(result.current).toHaveProperty('dismiss');
        expect(Array.isArray(result.current.toasts)).toBe(true);
        expect(typeof result.current.toast).toBe('function');
        expect(typeof result.current.dismiss).toBe('function');
    });

    it('should add a toast', () => {
        const { result } = renderHook(() => useToast());

        act(() => {
            result.current.toast({
                title: 'Test Toast',
                description: 'This is a test',
            });
        });

        expect(result.current.toasts.length).toBeGreaterThan(0);
        expect(result.current.toasts[0].title).toBe('Test Toast');
    });

    it('should dismiss a toast', () => {
        const { result } = renderHook(() => useToast());

        let toastId: string;

        act(() => {
            const { id } = result.current.toast({
                title: 'Toast to dismiss',
            });
            toastId = id;
        });

        expect(result.current.toasts.length).toBeGreaterThan(0);

        act(() => {
            result.current.dismiss(toastId);
        });

        // Toast should be marked as closed (open: false)
        const dismissedToast = result.current.toasts.find(t => t.id === toastId);
        expect(dismissedToast?.open).toBe(false);
    });

    it('should not cause infinite re-renders', () => {
        let renderCount = 0;

        const { result } = renderHook(() => {
            renderCount++;
            return useToast();
        });

        const initialRenderCount = renderCount;

        // Add a toast
        act(() => {
            result.current.toast({
                title: 'Render test',
            });
        });

        // Should only add 1-2 renders for the toast, not infinite
        // If there's an infinite loop, renderCount would be much higher
        expect(renderCount).toBeLessThan(initialRenderCount + 10);
    });

    it('should work with the standalone toast function', () => {
        const { result } = renderHook(() => useToast());

        act(() => {
            toast({
                title: 'Standalone Toast',
                variant: 'default',
            });
        });

        expect(result.current.toasts.length).toBeGreaterThan(0);
    });
});
