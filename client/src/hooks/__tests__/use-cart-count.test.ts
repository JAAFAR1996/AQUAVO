/**
 * useCartCount Hook Tests
 * Tests for the cart count hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCartCount } from '../use-cart-count';
import React from 'react';

// Mock cart context
let mockCartItems: { quantity: number }[] = [];
vi.mock('@/contexts/cart-context', () => ({
    useCart: () => ({
        items: mockCartItems,
    }),
}));

describe('useCartCount', () => {
    beforeEach(() => {
        mockCartItems = [];
    });

    it('should return 0 when cart is empty', () => {
        mockCartItems = [];
        const { result } = renderHook(() => useCartCount());
        expect(result.current).toBe(0);
    });

    it('should return correct count for single item', () => {
        mockCartItems = [{ quantity: 1 }];
        const { result } = renderHook(() => useCartCount());
        expect(result.current).toBe(1);
    });

    it('should sum quantities for multiple items', () => {
        mockCartItems = [
            { quantity: 2 },
            { quantity: 3 },
            { quantity: 1 },
        ];
        const { result } = renderHook(() => useCartCount());
        expect(result.current).toBe(6); // 2 + 3 + 1
    });

    it('should handle large quantities', () => {
        mockCartItems = [
            { quantity: 100 },
            { quantity: 200 },
        ];
        const { result } = renderHook(() => useCartCount());
        expect(result.current).toBe(300);
    });
});
