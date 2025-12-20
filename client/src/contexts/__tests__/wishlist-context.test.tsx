/**
 * Wishlist Context Tests
 * Tests for wishlist functionality - add, remove, check if in wishlist
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WishlistProvider, useWishlist, WishlistItem } from '../wishlist-context';
import React from 'react';

// Mock auth context
vi.mock('../auth-context', () => ({
    useAuth: () => ({
        user: null,
    }),
}));

// Test component to access wishlist context
function TestWishlistConsumer() {
    const { items, addItem, removeItem, isInWishlist, clearWishlist, totalItems } = useWishlist();

    const testProduct = {
        id: 'prod-123',
        slug: 'test-product',
        name: 'Test Product',
        brand: 'Test Brand',
        price: 25000,
        originalPrice: 30000,
        rating: 4.5,
        reviewCount: 10,
        thumbnail: '/images/test.jpg',
        image: '/images/test.jpg',
        images: ['/images/test.jpg'],
        category: 'أطعمة',
    };

    return (
        <div>
            <div data-testid="totalItems">{totalItems}</div>
            <div data-testid="itemCount">{items.length}</div>
            <div data-testid="isInWishlist">{isInWishlist('prod-123') ? 'yes' : 'no'}</div>
            <div data-testid="items">{JSON.stringify(items.map(i => i.id))}</div>
            <button onClick={() => addItem(testProduct)}>Add Item</button>
            <button onClick={() => removeItem('prod-123')}>Remove Item</button>
            <button onClick={() => clearWishlist()}>Clear Wishlist</button>
        </div>
    );
}

describe('WishlistContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Initial State', () => {
        it('should start with empty wishlist', () => {
            render(
                <WishlistProvider>
                    <TestWishlistConsumer />
                </WishlistProvider>
            );

            expect(screen.getByTestId('totalItems')).toHaveTextContent('0');
            expect(screen.getByTestId('itemCount')).toHaveTextContent('0');
        });

        it('should load wishlist from localStorage for guest users', async () => {
            const storedWishlist: WishlistItem[] = [
                {
                    id: 'prod-1',
                    name: 'Product 1',
                    price: 10000,
                    image: '/img.jpg',
                    slug: 'prod-1',
                    brand: 'Brand',
                    rating: 4,
                    category: 'Category'
                },
            ];
            localStorage.setItem('fish-web-wishlist-v2', JSON.stringify(storedWishlist));

            render(
                <WishlistProvider>
                    <TestWishlistConsumer />
                </WishlistProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('totalItems')).toHaveTextContent('1');
            });
        });
    });

    describe('Add Item', () => {
        it('should add new item to wishlist', async () => {
            const user = userEvent.setup();

            render(
                <WishlistProvider>
                    <TestWishlistConsumer />
                </WishlistProvider>
            );

            await user.click(screen.getByText('Add Item'));

            await waitFor(() => {
                expect(screen.getByTestId('totalItems')).toHaveTextContent('1');
                expect(screen.getByTestId('isInWishlist')).toHaveTextContent('yes');
            });
        });

        it('should not add duplicate items to wishlist', async () => {
            const user = userEvent.setup();

            render(
                <WishlistProvider>
                    <TestWishlistConsumer />
                </WishlistProvider>
            );

            await user.click(screen.getByText('Add Item'));
            await user.click(screen.getByText('Add Item')); // Try to add again

            await waitFor(() => {
                expect(screen.getByTestId('totalItems')).toHaveTextContent('1'); // Still 1
            });
        });

        it('should persist wishlist to localStorage for guest', async () => {
            const user = userEvent.setup();

            render(
                <WishlistProvider>
                    <TestWishlistConsumer />
                </WishlistProvider>
            );

            await user.click(screen.getByText('Add Item'));

            await waitFor(() => {
                const stored = localStorage.getItem('fish-web-wishlist-v2');
                expect(stored).not.toBeNull();
                const parsed = JSON.parse(stored!);
                expect(parsed).toHaveLength(1);
                expect(parsed[0].id).toBe('prod-123');
            });
        });
    });

    describe('Remove Item', () => {
        it('should remove item from wishlist', async () => {
            const user = userEvent.setup();

            render(
                <WishlistProvider>
                    <TestWishlistConsumer />
                </WishlistProvider>
            );

            // Add item first
            await user.click(screen.getByText('Add Item'));
            await waitFor(() => {
                expect(screen.getByTestId('totalItems')).toHaveTextContent('1');
            });

            // Remove item
            await user.click(screen.getByText('Remove Item'));

            await waitFor(() => {
                expect(screen.getByTestId('totalItems')).toHaveTextContent('0');
                expect(screen.getByTestId('isInWishlist')).toHaveTextContent('no');
            });
        });
    });

    describe('isInWishlist', () => {
        it('should return true when item is in wishlist', async () => {
            const user = userEvent.setup();

            render(
                <WishlistProvider>
                    <TestWishlistConsumer />
                </WishlistProvider>
            );

            expect(screen.getByTestId('isInWishlist')).toHaveTextContent('no');

            await user.click(screen.getByText('Add Item'));

            await waitFor(() => {
                expect(screen.getByTestId('isInWishlist')).toHaveTextContent('yes');
            });
        });
    });

    describe('Clear Wishlist', () => {
        it('should clear all items from wishlist', async () => {
            const user = userEvent.setup();

            render(
                <WishlistProvider>
                    <TestWishlistConsumer />
                </WishlistProvider>
            );

            // Add item
            await user.click(screen.getByText('Add Item'));
            await waitFor(() => {
                expect(screen.getByTestId('totalItems')).toHaveTextContent('1');
            });

            // Clear wishlist
            await user.click(screen.getByText('Clear Wishlist'));

            await waitFor(() => {
                expect(screen.getByTestId('totalItems')).toHaveTextContent('0');
                expect(screen.getByTestId('itemCount')).toHaveTextContent('0');
            });
        });
    });

    describe('useWishlist Hook', () => {
        it('should throw error when used outside WishlistProvider', () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            expect(() => {
                render(<TestWishlistConsumer />);
            }).toThrow('useWishlist must be used within a WishlistProvider');

            consoleSpy.mockRestore();
        });
    });
});
