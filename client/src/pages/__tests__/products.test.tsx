/**
 * Products Page Tests
 * Tests for the products listing page with filtering and sorting
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock wouter
vi.mock('wouter', () => ({
    useLocation: () => ['/products', vi.fn()],
    useParams: () => ({}),
    useRoute: () => [false, {}],
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

// Mock contexts
vi.mock('@/contexts/cart-context', () => ({
    useCart: () => ({
        items: [],
        itemCount: 0,
        addItem: vi.fn()
    }),
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
        compareIds: [],
        products: [],
        addToCompare: vi.fn(),
        removeFromCompare: vi.fn(),
        isInCompare: vi.fn(() => false),
        clearCompare: vi.fn()
    }),
}));

// Mock API
vi.mock('@/lib/api', () => ({
    fetchProducts: vi.fn(() => Promise.resolve({
        products: [
            { id: '1', name: 'Test Fish Food', price: 15000, category: 'أطعمة', slug: 'test-fish-food' },
            { id: '2', name: 'Test Filter', price: 50000, category: 'فلاتر', slug: 'test-filter' },
        ],
        total: 2
    })),
    fetchProductAttributes: vi.fn(() => Promise.resolve({
        categories: ['أطعمة', 'فلاتر', 'سخانات'],
        brands: ['Tetra', 'JBL', 'Eheim'],
        priceRange: { min: 5000, max: 500000 }
    })),
    fetchPersonalizedOrder: vi.fn(() => Promise.resolve({ orderedIds: [] }))
}));

import Products from '../products';
import { fetchProducts } from '@/lib/api';

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

describe('Products Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(fetchProducts).mockResolvedValue({
            products: [
                { id: '1', name: 'Test Fish Food', price: 15000, category: 'أطعمة', slug: 'test-fish-food' },
                { id: '2', name: 'Test Filter', price: 50000, category: 'فلاتر', slug: 'test-filter' },
            ],
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should render the products page', () => {
        render(<Products />, { wrapper: createWrapper() });
        expect(screen.getByTestId('navbar')).toBeInTheDocument();
    });

    it('should show main content area', () => {
        render(<Products />, { wrapper: createWrapper() });
        expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('should have filter section', async () => {
        render(<Products />, { wrapper: createWrapper() });
        await waitFor(() => {
            expect(screen.getByRole('main')).toBeInTheDocument();
        });
    });

    it('should display products after loading', async () => {
        render(<Products />, { wrapper: createWrapper() });
        await waitFor(() => {
            expect(screen.getByRole('main')).toBeInTheDocument();
        }, { timeout: 3000 });
    });

    it('should render footer', () => {
        render(<Products />, { wrapper: createWrapper() });
        expect(screen.getByTestId('footer')).toBeInTheDocument();
    });

    it('uses a benefit-first store heading without a blanket authenticity claim', () => {
        render(<Products />, { wrapper: createWrapper() });
        expect(screen.getByRole('heading', { level: 1, name: 'جهّز حوضك على أساس واضح' })).toBeInTheDocument();
        expect(screen.queryByText(/أصلية لكل العراق/i)).not.toBeInTheDocument();
    });

    it('shows one recoverable error state when products fail to load', async () => {
        vi.mocked(fetchProducts).mockRejectedValue(new Error('network unavailable'));
        render(<Products />, { wrapper: createWrapper() });

        expect(await screen.findByRole('heading', { name: 'ما كدرنا نحمّل المنتجات' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'حاول مرة ثانية' })).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'لم يتم العثور على منتجات' })).not.toBeInTheDocument();
    });
});
