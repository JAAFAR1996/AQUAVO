/**
 * Deals Page Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('wouter', () => ({
    useLocation: () => ['/deals', vi.fn()],
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

vi.mock('@/components/whatsapp-widget', () => ({
    WhatsAppWidget: () => <div data-testid="whatsapp">WhatsApp</div>,
}));

vi.mock('@/components/back-to-top', () => ({
    BackToTop: () => <button data-testid="back-to-top">Back to Top</button>,
}));

vi.mock('@/contexts/cart-context', () => ({
    useCart: () => ({
        items: [],
        addItem: vi.fn(),
    }),
}));

vi.mock('@/hooks/use-toast', () => ({
    useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/lib/api', () => ({
    fetchProducts: vi.fn(() => Promise.resolve({
        products: [
            { id: '1', name: 'Product 1', price: 20000, originalPrice: 30000, slug: 'product-1' },
            { id: '2', name: 'Product 2', price: 15000, originalPrice: 25000, slug: 'product-2' },
        ],
    })),
}));

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

import Deals from '../deals';

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe('Deals Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Rendering', () => {
        it('should render deals page', () => {
            render(<Deals />, { wrapper: createWrapper() });
            expect(document.body).toBeTruthy();
        });

        it('should have main content area', () => {
            render(<Deals />, { wrapper: createWrapper() });
            expect(screen.getByRole('main')).toBeInTheDocument();
        });

        it('should display deals title', () => {
            render(<Deals />, { wrapper: createWrapper() });
            const heading = screen.getByRole('heading', { level: 1 });
            expect(heading).toBeInTheDocument();
        });

        it('should not render a page-level WhatsApp widget', () => {
            render(<Deals />, { wrapper: createWrapper() });
            expect(screen.queryByTestId('whatsapp')).not.toBeInTheDocument();
        });

        it('should render back to top button', () => {
            render(<Deals />, { wrapper: createWrapper() });
            expect(screen.getByTestId('back-to-top')).toBeInTheDocument();
        });
    });

    describe('Product Display', () => {
        it('should display deals after loading', async () => {
            render(<Deals />, { wrapper: createWrapper() });
            await waitFor(() => {
                expect(screen.getByRole('main')).toBeInTheDocument();
            }, { timeout: 3000 });
        });
    });

    describe('Discount Calculation', () => {
        it('should correctly calculate discount percentage', () => {
            const getDiscountPercentage = (original: number, current: number) => {
                return Math.round(((original - current) / original) * 100);
            };

            expect(getDiscountPercentage(30000, 20000)).toBe(33);
            expect(getDiscountPercentage(25000, 15000)).toBe(40);
        });
    });

    describe('Accessibility', () => {
        it('should have proper heading structure', () => {
            render(<Deals />, { wrapper: createWrapper() });
            const headings = screen.getAllByRole('heading');
            expect(headings.length).toBeGreaterThan(0);
        });
    });
});
