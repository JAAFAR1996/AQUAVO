/**
 * AQUAVO v2 home-page contract.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock wouter
vi.mock('wouter', () => ({
    useLocation: () => ['/', vi.fn()],
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

vi.mock('@/contexts/cart-context', () => ({
    useCart: () => ({ items: [], itemCount: 0 }),
}));

vi.mock('@/contexts/wishlist-context', () => ({
    useWishlist: () => ({ items: [], itemCount: 0 }),
}));

vi.mock('@/contexts/auth-context', () => ({
    useAuth: () => ({ user: null, isAuthenticated: false, isLoading: false }),
}));

import Home from '../home';

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

describe('Home Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should render the home page without crashing', async () => {
        render(<Home />, { wrapper: createWrapper() });
        expect(document.body).toBeTruthy();
    });

    it('should have main content section', () => {
        render(<Home />, { wrapper: createWrapper() });
        expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('uses one clear value-proposition heading', () => {
        render(<Home />, { wrapper: createWrapper() });
        const headings = screen.getAllByRole('heading', { level: 1 });
        expect(headings).toHaveLength(1);
        expect(headings[0]).toHaveTextContent('معدات حوضك، مرتبة على احتياجك');
    });

    it('keeps the primary actions calm and useful', () => {
        render(<Home />, { wrapper: createWrapper() });
        expect(screen.getByRole('link', { name: /شوف المنتجات/i })).toHaveAttribute('href', '/products');
        expect(screen.getByRole('link', { name: /اختار حسب حوضك/i })).toHaveAttribute('href', '/tank-builder');
    });

    it('shows only verified service facts', () => {
        render(<Home />, { wrapper: createWrapper() });
        // Reworded once Al-Qaseh went live: the home page now advertises both
        // methods rather than cash only, which is what checkout actually offers.
        expect(screen.getByText(/طرق دفع مرنة/i)).toBeInTheDocument();
        expect(screen.getByText(/عند الاستلام أو إلكترونياً/i)).toBeInTheDocument();
        expect(screen.getByText(/5,000 د\.ع/i)).toBeInTheDocument();
        expect(screen.getByText(/دعم 24\/7/i)).toBeInTheDocument();
        expect(screen.queryByText(/أصلي 100%/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/نستورد مباشرة/i)).not.toBeInTheDocument();
    });

    it('offers stable category and education discovery without API data', () => {
        render(<Home />, { wrapper: createWrapper() });
        expect(screen.getByRole('heading', { name: 'ابدأ من احتياج الحوض' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /الفلاتر/i })).toHaveAttribute('href', '/products?category=%D8%A7%D9%84%D9%81%D9%84%D8%AA%D8%B1%D8%A9%20%D9%88%D8%A7%D9%84%D8%AA%D9%86%D9%82%D9%8A%D8%A9');
        expect(screen.getByRole('heading', { name: 'المعلومة قبل القطعة' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /شوف أدلة AQUAVO/i })).toHaveAttribute('href', '/guides');
    });

    it('should not render a page-level WhatsApp widget', () => {
        render(<Home />, { wrapper: createWrapper() });
        expect(screen.queryByTestId('whatsapp-widget')).not.toBeInTheDocument();
    });

    it('should contain navigation links', async () => {
        render(<Home />, { wrapper: createWrapper() });
        await waitFor(() => {
            const links = screen.getAllByRole('link');
            expect(links.length).toBeGreaterThan(0);
        });
    });

    it('does not nest interactive controls', () => {
        const { container } = render(<Home />, { wrapper: createWrapper() });
        expect(container.querySelector('a button, button a')).not.toBeInTheDocument();
    });
});
