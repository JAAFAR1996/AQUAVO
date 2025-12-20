/**
 * Cart Context Tests
 * Tests for shopping cart functionality - add, remove, update, sync with server
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CartProvider, useCart, CartItem } from '../cart-context';
import React from 'react';

// Mock auth context
vi.mock('../auth-context', () => ({
    useAuth: () => ({
        user: null,
    }),
}));

// Mock toast hook
vi.mock('@/hooks/use-toast', () => ({
    toast: vi.fn(),
}));

// Test component to access cart context
function TestCartConsumer() {
    const { items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice } = useCart();

    const testProduct = {
        id: 'prod-123',
        slug: 'test-product',
        name: 'Test Product',
        brand: 'Test Brand',
        price: 25000,
        rating: 4.5,
        reviewCount: 10,
        thumbnail: '/images/test.jpg',
        images: ['/images/test.jpg'],
        category: 'أطعمة',
    };

    return (
        <div>
            <div data-testid="totalItems">{totalItems}</div>
            <div data-testid="totalPrice">{totalPrice}</div>
            <div data-testid="itemCount">{items.length}</div>
            <div data-testid="items">{JSON.stringify(items)}</div>
            <button onClick={() => addItem(testProduct)}>Add Item</button>
            <button onClick={() => removeItem('prod-123')}>Remove Item</button>
            <button onClick={() => updateQuantity('prod-123', 5)}>Update Quantity</button>
            <button onClick={() => clearCart()}>Clear Cart</button>
        </div>
    );
}

describe('CartContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        global.fetch = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Initial State', () => {
        it('should start with empty cart', () => {
            render(
                <CartProvider>
                    <TestCartConsumer />
                </CartProvider>
            );

            expect(screen.getByTestId('totalItems')).toHaveTextContent('0');
            expect(screen.getByTestId('totalPrice')).toHaveTextContent('0');
            expect(screen.getByTestId('itemCount')).toHaveTextContent('0');
        });

        it('should load cart from localStorage for guest users', async () => {
            const storedCart: CartItem[] = [
                { id: 'prod-1', name: 'Product 1', price: 10000, quantity: 2, image: '/img.jpg', slug: 'prod-1' },
            ];
            localStorage.setItem('fish-web-cart-v2', JSON.stringify(storedCart));

            render(
                <CartProvider>
                    <TestCartConsumer />
                </CartProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('totalItems')).toHaveTextContent('2');
                expect(screen.getByTestId('totalPrice')).toHaveTextContent('20000');
            });
        });
    });

    describe('Add Item', () => {
        it('should add new item to cart', async () => {
            const user = userEvent.setup();

            render(
                <CartProvider>
                    <TestCartConsumer />
                </CartProvider>
            );

            await user.click(screen.getByText('Add Item'));

            await waitFor(() => {
                expect(screen.getByTestId('totalItems')).toHaveTextContent('1');
                expect(screen.getByTestId('totalPrice')).toHaveTextContent('25000');
            });
        });

        it('should increment quantity when adding existing item', async () => {
            const user = userEvent.setup();

            render(
                <CartProvider>
                    <TestCartConsumer />
                </CartProvider>
            );

            await user.click(screen.getByText('Add Item'));
            await user.click(screen.getByText('Add Item'));

            await waitFor(() => {
                expect(screen.getByTestId('totalItems')).toHaveTextContent('2');
                expect(screen.getByTestId('totalPrice')).toHaveTextContent('50000');
            });
        });

        it('should persist cart to localStorage for guest', async () => {
            const user = userEvent.setup();

            render(
                <CartProvider>
                    <TestCartConsumer />
                </CartProvider>
            );

            await user.click(screen.getByText('Add Item'));

            await waitFor(() => {
                const stored = localStorage.getItem('fish-web-cart-v2');
                expect(stored).not.toBeNull();
                const parsed = JSON.parse(stored!);
                expect(parsed).toHaveLength(1);
                expect(parsed[0].id).toBe('prod-123');
            });
        });
    });

    describe('Remove Item', () => {
        it('should remove item from cart', async () => {
            const user = userEvent.setup();

            render(
                <CartProvider>
                    <TestCartConsumer />
                </CartProvider>
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
                expect(screen.getByTestId('itemCount')).toHaveTextContent('0');
            });
        });
    });

    describe('Update Quantity', () => {
        it('should update item quantity', async () => {
            const user = userEvent.setup();

            render(
                <CartProvider>
                    <TestCartConsumer />
                </CartProvider>
            );

            // Add item first
            await user.click(screen.getByText('Add Item'));
            await waitFor(() => {
                expect(screen.getByTestId('totalItems')).toHaveTextContent('1');
            });

            // Update quantity to 5
            await user.click(screen.getByText('Update Quantity'));

            await waitFor(() => {
                expect(screen.getByTestId('totalItems')).toHaveTextContent('5');
                expect(screen.getByTestId('totalPrice')).toHaveTextContent('125000');
            });
        });

        it('should remove item when quantity set to 0', async () => {
            const user = userEvent.setup();

            const TestComponent = () => {
                const { items, addItem, updateQuantity, totalItems } = useCart();
                const testProduct = {
                    id: 'prod-123',
                    slug: 'test-product',
                    name: 'Test Product',
                    brand: 'Test Brand',
                    price: 25000,
                    rating: 4.5,
                    reviewCount: 10,
                    thumbnail: '/images/test.jpg',
                    images: ['/images/test.jpg'],
                    category: 'أطعمة',
                };
                return (
                    <div>
                        <div data-testid="totalItems">{totalItems}</div>
                        <button onClick={() => addItem(testProduct)}>Add</button>
                        <button onClick={() => updateQuantity('prod-123', 0)}>Set Zero</button>
                    </div>
                );
            };

            render(
                <CartProvider>
                    <TestComponent />
                </CartProvider>
            );

            await user.click(screen.getByText('Add'));
            await waitFor(() => {
                expect(screen.getByTestId('totalItems')).toHaveTextContent('1');
            });

            await user.click(screen.getByText('Set Zero'));

            await waitFor(() => {
                expect(screen.getByTestId('totalItems')).toHaveTextContent('0');
            });
        });
    });

    describe('Clear Cart', () => {
        it('should clear all items from cart', async () => {
            const user = userEvent.setup();

            render(
                <CartProvider>
                    <TestCartConsumer />
                </CartProvider>
            );

            // Add multiple items
            await user.click(screen.getByText('Add Item'));
            await user.click(screen.getByText('Add Item'));

            await waitFor(() => {
                expect(screen.getByTestId('totalItems')).toHaveTextContent('2');
            });

            // Clear cart
            await user.click(screen.getByText('Clear Cart'));

            await waitFor(() => {
                expect(screen.getByTestId('totalItems')).toHaveTextContent('0');
                expect(screen.getByTestId('itemCount')).toHaveTextContent('0');
            });
        });
    });

    describe('useCart Hook', () => {
        it('should throw error when used outside CartProvider', () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            expect(() => {
                render(<TestCartConsumer />);
            }).toThrow('useCart must be used within a CartProvider');

            consoleSpy.mockRestore();
        });
    });

    describe('Total Calculations', () => {
        it('should calculate total items correctly with multiple quantities', async () => {
            const storedCart: CartItem[] = [
                { id: 'prod-1', name: 'Product 1', price: 10000, quantity: 3, image: '/img.jpg', slug: 'prod-1' },
                { id: 'prod-2', name: 'Product 2', price: 20000, quantity: 2, image: '/img.jpg', slug: 'prod-2' },
            ];
            localStorage.setItem('fish-web-cart-v2', JSON.stringify(storedCart));

            render(
                <CartProvider>
                    <TestCartConsumer />
                </CartProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('totalItems')).toHaveTextContent('5'); // 3 + 2
                expect(screen.getByTestId('totalPrice')).toHaveTextContent('70000'); // (10000*3) + (20000*2)
            });
        });
    });
});
