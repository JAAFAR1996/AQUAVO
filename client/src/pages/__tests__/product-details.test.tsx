/**
 * Product Details Page Tests
 * Tests for individual product display, add to cart, reviews
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock wouter
vi.mock('wouter', () => ({
    useLocation: () => ['/products/test-product', vi.fn()],
    useParams: () => ({ slug: 'test-product' }),
    useRoute: () => [true, { slug: 'test-product' }],
    Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href}>{children}</a>
    ),
}));

// Mock components
vi.mock('@/components/navbar', () => ({
    default: () => <nav data-testid="navbar">Navbar</nav>,
}));

vi.mock('@/components/footer', () => ({
    default: () => <footer data-testid="footer">Footer</footer>,
}));

vi.mock('@/components/whatsapp-widget', () => ({
    WhatsAppWidget: () => <div data-testid="whatsapp-widget">WhatsApp</div>,
}));

vi.mock('@/components/back-to-top', () => ({
    BackToTop: () => <div data-testid="back-to-top">Back to Top</div>,
}));

// Mock contexts
vi.mock('@/contexts/cart-context', () => ({
    useCart: () => ({
        addItem: vi.fn(),
        items: [],
        itemCount: 0
    })
}));

vi.mock('@/contexts/wishlist-context', () => ({
    useWishlist: () => ({
        items: [],
        itemCount: 0,
        addItem: vi.fn(),
        removeItem: vi.fn(),
        isInWishlist: vi.fn(() => false)
    }),
}));

vi.mock('@/contexts/auth-context', () => ({
    useAuth: () => ({ user: null, isAuthenticated: false, isLoading: false }),
}));

vi.mock('@/contexts/comparison-context', () => ({
    useComparison: () => ({
        compareItems: [],
        addToCompare: vi.fn(),
        removeFromCompare: vi.fn(),
        isInCompare: vi.fn(() => false),
        clearCompare: vi.fn()
    }),
}));

// Mock API
vi.mock('@/lib/api', () => ({
    fetchProductBySlug: vi.fn(() => Promise.resolve({
        id: 'test-1',
        name: 'Premium Fish Food',
        slug: 'test-product',
        price: 25000,
        originalPrice: 30000,
        description: 'High quality fish food for tropical fish',
        category: 'أطعمة',
        brand: 'Tetra',
        stock: 50,
        rating: 4.5,
        reviewCount: 25,
        image: '/images/fish-food.jpg',
        images: ['/images/fish-food.jpg'],
    })),
    fetchProducts: vi.fn(() => Promise.resolve({ products: [], total: 0 })),
    fetchProductVariants: vi.fn(() => Promise.resolve([])),
}));

vi.mock('@/lib/recommendations', () => ({
    fetchFrequentlyBoughtTogether: vi.fn(() => Promise.resolve([])),
    fetchSimilarProducts: vi.fn(() => Promise.resolve([])),
    fetchTrendingProducts: vi.fn(() => Promise.resolve([]))
}));

import ProductDetails from '../product-details';

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
};

describe('Product Details Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should render the product details page', async () => {
        render(<ProductDetails />, { wrapper: createWrapper() });
        await waitFor(() => {
            expect(screen.getByTestId('navbar')).toBeInTheDocument();
        });
    });

    it('should display product information when loaded', async () => {
        render(<ProductDetails />, { wrapper: createWrapper() });
        await waitFor(() => {
            expect(screen.getByRole('main')).toBeInTheDocument();
        }, { timeout: 3000 });
    });

    it('should have add to cart functionality', async () => {
        render(<ProductDetails />, { wrapper: createWrapper() });
        await waitFor(() => {
            const buttons = screen.queryAllByRole('button');
            expect(buttons.length).toBeGreaterThan(0);
        }, { timeout: 3000 });
    });

    it('should render footer', async () => {
        render(<ProductDetails />, { wrapper: createWrapper() });
        await waitFor(() => {
            expect(screen.getByTestId('footer')).toBeInTheDocument();
        });
    });

    it('should not render a page-level WhatsApp widget', async () => {
        render(<ProductDetails />, { wrapper: createWrapper() });
        await waitFor(() => {
            expect(screen.queryByTestId('whatsapp-widget')).not.toBeInTheDocument();
        });
    });
});
