/**
 * Product Details Page Tests
 * Tests for individual product display, add to cart, reviews
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const mockAddItem = vi.hoisted(() => vi.fn());
const mockToast = vi.hoisted(() => vi.fn());

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
        addItem: mockAddItem,
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

vi.mock('@/hooks/use-toast', () => ({
    useToast: () => ({
        toast: mockToast,
    }),
}));

vi.mock('@/lib/tiktok-pixel', () => ({
    ttqViewContent: vi.fn(),
    ttqAddToCart: vi.fn(),
}));

vi.mock('@/lib/meta-pixel', () => ({
    metaTrackViewContent: vi.fn(),
    metaTrackAddToCart: vi.fn(),
}));

vi.mock('@/lib/analytics', () => ({
    trackViewItem: vi.fn(),
    trackAddToCart: vi.fn(),
}));

vi.mock('@/lib/posthog', () => ({
    phTrackViewContent: vi.fn(),
    phTrackAddToCart: vi.fn(),
    phTrackWhatsAppClick: vi.fn(),
}));

// Mock API
vi.mock('@/lib/api', () => ({
    fetchProductBySlug: vi.fn(() => Promise.resolve({
        id: 'test-1',
        name: 'سيفون تغيير ماء',
        slug: 'test-product',
        price: 28000,
        originalPrice: 30000,
        description: 'سيفون عملي لتبديل الماء',
        category: 'معدات',
        brand: 'Houyi',
        stock: 50,
        rating: 4.5,
        reviewCount: 25,
        image: '/images/siphon.jpg',
        images: ['/images/siphon.jpg'],
        hasVariants: true,
        variants: [
            {
                id: 'variant-150',
                label: '1.5 متر',
                price: 28000,
                stock: 10,
                isDefault: true,
            },
            {
                id: 'variant-170',
                label: '1.7 متر',
                price: 32000,
                stock: 8,
            },
        ],
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

    it('should preserve the selected variant metadata when adding to cart', async () => {
        const user = await import('@testing-library/user-event').then((m) => m.default.setup());

        render(<ProductDetails />, { wrapper: createWrapper() });

        await waitFor(() => {
            expect(screen.getByRole('button', { name: '1.7 متر' })).toBeInTheDocument();
        });

        await user.click(screen.getByRole('button', { name: '1.7 متر' }));
        await user.click(screen.getByRole('button', { name: /أضف للسلة/ }));

        expect(mockAddItem).toHaveBeenCalledTimes(1);
        expect(mockAddItem).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'test-1',
                name: 'سيفون تغيير ماء',
                price: 32000,
                _variantId: 'variant-170',
                _variantLabel: '1.7 متر',
            }),
            1
        );
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

    it('does not invent authenticity or warranty claims for a non-YEE product', async () => {
        render(<ProductDetails />, { wrapper: createWrapper() });
        expect(await screen.findByRole('heading', { level: 1, name: 'سيفون تغيير ماء' })).toBeInTheDocument();
        expect(screen.queryByText(/أصلي 100%/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/ضمان الجودة/i)).not.toBeInTheDocument();
        expect(screen.getByText('معلومات المنتج')).toBeInTheDocument();
    });

    // ---- Phase E: purchase confidence + CTA accessibility ----

    it('surfaces Cash on Delivery, flat shipping fee, and 24/7 support near the CTA', async () => {
        render(<ProductDetails />, { wrapper: createWrapper() });
        await screen.findByRole('heading', { level: 1, name: 'سيفون تغيير ماء' });

        expect(screen.getByText(/الدفع عند الاستلام فقط/)).toBeInTheDocument();
        expect(screen.getByText(/5,000 د.ع/)).toBeInTheDocument();
        expect(screen.getByText(/دعم AQUAVO متوفر 24\/7/)).toBeInTheDocument();
    });

    it('never implies a payment gateway or live fish/plants are sold', async () => {
        render(<ProductDetails />, { wrapper: createWrapper() });
        await screen.findByRole('heading', { level: 1, name: 'سيفون تغيير ماء' });

        expect(screen.queryByText(/بطاقة ائتمان|فيزا|ماستركارد/)).not.toBeInTheDocument();
        expect(screen.queryByText(/أسماك حية|نباتات مائية/)).not.toBeInTheDocument();
    });

    it('exposes the add-to-cart button as busy while the request is pending', async () => {
        const user = await import('@testing-library/user-event').then((m) => m.default.setup());
        let resolveAdd: (ok: boolean) => void = () => { };
        mockAddItem.mockImplementation(
            () => new Promise<boolean>((resolve) => { resolveAdd = resolve; })
        );

        render(<ProductDetails />, { wrapper: createWrapper() });
        const mainCta = await screen.findByRole('button', { name: 'أضف إلى السلة' });

        await user.click(mainCta);

        expect(await screen.findByRole('button', { name: /جاري الإضافة/ })).toHaveAttribute('aria-busy', 'true');

        resolveAdd(true);

        await waitFor(() => {
            expect(screen.queryByRole('button', { name: /جاري الإضافة/ })).not.toBeInTheDocument();
        });
    });

    it('groups the quantity stepper under an accessible label and announces changes', async () => {
        render(<ProductDetails />, { wrapper: createWrapper() });
        await screen.findByRole('heading', { level: 1, name: 'سيفون تغيير ماء' });

        expect(screen.getByRole('group', { name: 'الكمية:' })).toBeInTheDocument();
        expect(screen.getByText('1')).toHaveAttribute('aria-live', 'polite');
    });

    // ---- WCAG 44x44 touch target regression: quantity stepper must stay 44x44 at desktop widths ----

    it('keeps the quantity decrease control at 44x44 on both mobile and desktop breakpoints', async () => {
        render(<ProductDetails />, { wrapper: createWrapper() });
        await screen.findByRole('heading', { level: 1, name: 'سيفون تغيير ماء' });

        const decreaseButton = screen.getByRole('button', { name: 'تقليل الكمية' });
        expect(decreaseButton).toHaveClass('h-11', 'w-11', 'md:h-11', 'md:w-11');
    });

    it('keeps the quantity increase control at 44x44 on both mobile and desktop breakpoints', async () => {
        render(<ProductDetails />, { wrapper: createWrapper() });
        await screen.findByRole('heading', { level: 1, name: 'سيفون تغيير ماء' });

        const increaseButton = screen.getByRole('button', { name: 'زيادة الكمية' });
        expect(increaseButton).toHaveClass('h-11', 'w-11', 'md:h-11', 'md:w-11');
    });

    it('disables the decrease control at the minimum quantity and keeps the increase control enabled', async () => {
        render(<ProductDetails />, { wrapper: createWrapper() });
        await screen.findByRole('heading', { level: 1, name: 'سيفون تغيير ماء' });

        expect(screen.getByRole('button', { name: 'تقليل الكمية' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'زيادة الكمية' })).not.toBeDisabled();
        expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('increments and decrements the quantity via the stepper controls', async () => {
        const user = await import('@testing-library/user-event').then((m) => m.default.setup());

        render(<ProductDetails />, { wrapper: createWrapper() });
        await screen.findByRole('heading', { level: 1, name: 'سيفون تغيير ماء' });

        const decreaseButton = screen.getByRole('button', { name: 'تقليل الكمية' });
        const increaseButton = screen.getByRole('button', { name: 'زيادة الكمية' });

        await user.click(increaseButton);
        expect(screen.getByText('2')).toBeInTheDocument();

        await user.click(increaseButton);
        expect(screen.getByText('3')).toBeInTheDocument();

        await user.click(decreaseButton);
        expect(screen.getByText('2')).toBeInTheDocument();
        expect(decreaseButton).not.toBeDisabled();

        await user.click(decreaseButton);
        expect(screen.getByText('1')).toBeInTheDocument();
        expect(decreaseButton).toBeDisabled();
    });
});
