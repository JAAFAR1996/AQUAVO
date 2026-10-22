/**
 * Search Results Page Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('wouter', () => ({
    useLocation: () => ['/search?q=fish', vi.fn()],
    useSearch: () => 'q=fish',
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

vi.mock('@/contexts/cart-context', () => ({
    useCart: () => ({ items: [], itemCount: 0, addItem: vi.fn() }),
}));

vi.mock('@/contexts/wishlist-context', () => ({
    useWishlist: () => ({ items: [], itemCount: 0, addItem: vi.fn(), isInWishlist: vi.fn(() => false) }),
}));

vi.mock('@/contexts/auth-context', () => ({
    useAuth: () => ({ user: null, isAuthenticated: false, isLoading: false }),
}));

vi.mock('@/contexts/comparison-context', () => ({
    useComparison: () => ({
        compareItems: [],
        addToCompare: vi.fn(),
        isInCompare: vi.fn(() => false),
    }),
}));

vi.mock('@/lib/api', () => ({
    searchProducts: vi.fn(() => Promise.resolve([])),
    fetchSmartSearch: vi.fn(() => Promise.resolve({ products: [], semantic: false })),
}));

vi.mock('@/hooks/use-fish-data', () => ({
    useFishData: () => ({ data: [], isLoading: false, isFetching: false, isSuccess: true }),
}));

vi.mock('@/hooks/use-listing-restoration', () => ({
    useListingRestoration: () => ({ containerRef: { current: null }, isRestoring: false }),
}));

import SearchResults from '../search-results';

const createWrapper = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe('Search Results Page', () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(() => vi.restoreAllMocks());

    it('should render search results page', () => {
        render(<SearchResults />, { wrapper: createWrapper() });
        expect(document.body).toBeTruthy();
    });

    it('should display search results', async () => {
        render(<SearchResults />, { wrapper: createWrapper() });
        await waitFor(() => expect(screen.getByRole('main')).toBeInTheDocument());
    });

});
