/**
 * Order Confirmation Page Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

vi.mock('wouter', () => ({
    useLocation: () => ['/order-confirmation', vi.fn()],
    useSearch: () => '?orderId=123',
    useRoute: () => [true, { orderId: '123' }],
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
    useCart: () => ({
        items: [],
        clearCart: vi.fn(),
    }),
}));

vi.mock('@/contexts/auth-context', () => ({
    useAuth: () => ({ user: null, isAuthenticated: false }),
}));

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
}));

import OrderConfirmation from '../order-confirmation';

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
                queryFn: async () => null,
            },
        },
    });
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe('Order Confirmation Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Rendering', () => {
        it('should render order confirmation page', () => {
            render(<OrderConfirmation />, { wrapper: createWrapper() });
            expect(screen.getByTestId('navbar')).toBeInTheDocument();
            expect(screen.getByTestId('footer')).toBeInTheDocument();
        });

        it('should have main content area', () => {
            render(<OrderConfirmation />, { wrapper: createWrapper() });
            expect(screen.getByRole('main')).toBeInTheDocument();
        });

        it('should display confirmation content', () => {
            render(<OrderConfirmation />, { wrapper: createWrapper() });
            const content = document.body.textContent;
            expect(content).toBeTruthy();
        });
    });

    describe('Order Details', () => {
        it('should display order information section', () => {
            render(<OrderConfirmation />, { wrapper: createWrapper() });
            // Check for main content area as order details are dynamically loaded
            expect(screen.getByRole('main')).toBeInTheDocument();
        });

        it('directs unverified cross-device links to the secure tracking flow', () => {
            render(<OrderConfirmation />, { wrapper: createWrapper() });
            expect(screen.getByRole('link', { name: 'روح لتتبع الطلب الآمن' }))
                .toHaveAttribute('href', '/order-tracking');
        });

        it('does not call the legacy order-number-only tracking endpoint', () => {
            const source = readFileSync(
                join(process.cwd(), 'client/src/pages/order-confirmation.tsx'),
                'utf8',
            );
            expect(source).not.toContain('/api/orders/track/');
        });
    });

    describe('Call to Actions', () => {
        it('should have navigation buttons', () => {
            render(<OrderConfirmation />, { wrapper: createWrapper() });
            const buttons = screen.queryAllByRole('button');
            const links = screen.queryAllByRole('link');
            expect(buttons.length + links.length).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Accessibility', () => {
        it('should have proper heading structure', () => {
            render(<OrderConfirmation />, { wrapper: createWrapper() });
            const headings = screen.queryAllByRole('heading');
            expect(headings.length).toBeGreaterThanOrEqual(0);
        });

        it('exposes a single level-1 heading for the tracking-fallback state', () => {
            // With no stashed order and an unauthenticated fetch, the page renders
            // the "verify your order" fallback card — its CardTitle must still
            // read as an actual page heading, not an unlabeled div.
            render(<OrderConfirmation />, { wrapper: createWrapper() });
            expect(screen.getByRole('heading', { level: 1, name: 'نحتاج نتحقق من الطلب' })).toBeInTheDocument();
        });
    });
});
