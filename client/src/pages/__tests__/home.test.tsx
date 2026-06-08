/**
 * Home Page Tests
 * Tests for the main landing page of FIST-LIVE
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
        expect(screen.getByTestId('navbar')).toBeInTheDocument();
        await waitFor(() => {
            expect(screen.getByTestId('footer')).toBeInTheDocument();
        });
    });

    it('should have main content section', () => {
        render(<Home />, { wrapper: createWrapper() });
        expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('should display hero section with heading', () => {
        render(<Home />, { wrapper: createWrapper() });
        const headings = screen.getAllByRole('heading');
        expect(headings.length).toBeGreaterThan(0);
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
});
