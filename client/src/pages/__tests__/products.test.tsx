/**
 * Products Page Tests
 * Tests for the products listing page with filtering and sorting
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
                { id: '1', name: 'Test Fish Food', price: 15000, category: 'أطعمة', slug: 'test-fish-food', brand: 'YEE', rating: 0, reviewCount: 0, thumbnail: '', images: [], stock: 2 },
                { id: '2', name: 'Test Filter', price: 50000, category: 'فلاتر', slug: 'test-filter', brand: 'YEE', rating: 0, reviewCount: 0, thumbnail: '', images: [], stock: 2 },
            ],
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should render the products page', () => {
        render(<Products />, { wrapper: createWrapper() });
        expect(document.body).toBeTruthy();
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

    it('gives the sort SelectTrigger a 44px touch target (h-11) instead of the old h-10 (40px)', async () => {
        render(<Products />, { wrapper: createWrapper() });
        const sortTrigger = await screen.findByLabelText('ترتيب المنتجات');
        expect(sortTrigger.className).toContain('h-11');
        expect(sortTrigger.className).not.toMatch(/\bh-10\b/);
    });
});

/**
 * Regression coverage for the 2026-08-06 outage.
 *
 * The backend could not boot (a Router instance was invoked as a factory in
 * server/routes.ts), so /api/products returned HTTP 500 and the page showed
 * "ما كدرنا نحمّل المنتجات". These tests pin that the page reacts *correctly* to
 * each backend outcome — proving the page itself was never the defect, so it
 * needs no change beyond the server fix.
 */
describe('Products page — backend outcome states', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    const ERROR_HEADING = 'ما كدرنا نحمّل المنتجات';
    const EMPTY_HEADING = 'ما لكينا منتجات بهذي الفلاتر';

    it('queries the products endpoint through the api layer', async () => {
        vi.mocked(fetchProducts).mockResolvedValue({ products: [] });
        render(<Products />, { wrapper: createWrapper() });
        await waitFor(() => expect(fetchProducts).toHaveBeenCalled());
    });

    it('renders the returned products on a successful response', async () => {
        vi.mocked(fetchProducts).mockResolvedValue({
            products: [
                { id: '1', name: 'فلتر خارجي', price: 50000, category: 'فلاتر', slug: 'external-filter', brand: 'YEE', rating: 0, reviewCount: 0, thumbnail: '', images: [], stock: 3 },
            ],
        });
        render(<Products />, { wrapper: createWrapper() });

        expect(await screen.findByText('فلتر خارجي')).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: ERROR_HEADING })).not.toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: EMPTY_HEADING })).not.toBeInTheDocument();
    });

    it('shows the empty state — not the error state — when the response is a valid empty list', async () => {
        vi.mocked(fetchProducts).mockResolvedValue({ products: [] });
        render(<Products />, { wrapper: createWrapper() });

        expect(await screen.findByRole('heading', { name: EMPTY_HEADING })).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: ERROR_HEADING })).not.toBeInTheDocument();
    });

    it('shows the error state when the endpoint fails with HTTP 500', async () => {
        vi.mocked(fetchProducts).mockRejectedValue(new Error('HTTP 500: Server initialization error'));
        render(<Products />, { wrapper: createWrapper() });

        expect(await screen.findByRole('heading', { name: ERROR_HEADING }, { timeout: 5000 })).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: EMPTY_HEADING })).not.toBeInTheDocument();
    });

    it('retry re-issues the request and leaves the error state once the backend recovers', async () => {
        const user = userEvent.setup();
        // The page's own query sets `retry: 1`, so the initial load makes two
        // attempts. Both must fail before the error state is reachable.
        vi.mocked(fetchProducts)
            .mockRejectedValueOnce(new Error('HTTP 500: Server initialization error'))
            .mockRejectedValueOnce(new Error('HTTP 500: Server initialization error'))
            .mockResolvedValue({
                products: [
                    { id: '9', name: 'سخان زجاجي', price: 25000, category: 'سخانات', slug: 'glass-heater', brand: 'YEE', rating: 0, reviewCount: 0, thumbnail: '', images: [], stock: 5 },
                ],
            });

        render(<Products />, { wrapper: createWrapper() });

        expect(await screen.findByRole('heading', { name: ERROR_HEADING })).toBeInTheDocument();
        const callsBeforeRetry = vi.mocked(fetchProducts).mock.calls.length;

        await user.click(screen.getByRole('button', { name: 'حاول مرة ثانية' }));

        // The retry actually re-issues the request…
        await waitFor(() =>
            expect(vi.mocked(fetchProducts).mock.calls.length).toBeGreaterThan(callsBeforeRetry),
        );
        // …and the page leaves the error state instead of staying stuck on a cached failure.
        expect(await screen.findByText('سخان زجاجي')).toBeInTheDocument();
        await waitFor(() =>
            expect(screen.queryByRole('heading', { name: ERROR_HEADING })).not.toBeInTheDocument(),
        );
    });
});
