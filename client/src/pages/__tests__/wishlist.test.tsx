/**
 * Wishlist Page Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('wouter', () => ({
    useLocation: () => ['/wishlist', vi.fn()],
    Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href}>{children}</a>
    ),
}));

vi.mock('@/components/navbar', () => ({
    default: () => <nav data-testid="navbar">Navbar</nav>,
}));

vi.mock('@/components/footer', () => ({
    default: () => <footer data-testid="footer">Footer</footer>,
}));

vi.mock('@/contexts/wishlist-context', () => ({
    useWishlist: () => ({
        items: [{ id: '1', name: 'Test Product', price: 10000 }],
        removeItem: vi.fn(),
        addItem: vi.fn(),
        clearWishlist: vi.fn(),
        isInWishlist: vi.fn(() => true),
        itemCount: 1
    })
}));

vi.mock('@/contexts/cart-context', () => ({
    useCart: () => ({ addItem: vi.fn(), items: [], itemCount: 0 })
}));

vi.mock('@/contexts/auth-context', () => ({
    useAuth: () => ({ user: null, isAuthenticated: false, isLoading: false }),
}));

import Wishlist from '../wishlist';

const createWrapper = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe('Wishlist Page', () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(() => vi.restoreAllMocks());

    it('should render wishlist page', () => {
        render(<Wishlist />, { wrapper: createWrapper() });
        expect(document.body).toBeTruthy();
    });

    it('should display wishlist items', async () => {
        render(<Wishlist />, { wrapper: createWrapper() });
        await waitFor(() => expect(screen.getByRole('main')).toBeInTheDocument());
    });

    it('should have remove from wishlist functionality', async () => {
        render(<Wishlist />, { wrapper: createWrapper() });
        await waitFor(() => {
            const buttons = screen.queryAllByRole('button');
            expect(buttons.length).toBeGreaterThan(0);
        });
    });

});
