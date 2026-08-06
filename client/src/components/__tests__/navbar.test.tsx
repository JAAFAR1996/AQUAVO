/**
 * Navbar Component Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { NavbarPreferencesProvider } from '@/hooks/use-navbar-preferences';

const mockSetLocation = vi.hoisted(() => vi.fn());

vi.mock('wouter', () => ({
    useLocation: () => ['/', mockSetLocation],
    Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href}>{children}</a>
    ),
}));

vi.mock('@/contexts/cart-context', () => ({
    useCart: () => ({
        items: [{ id: '1', productId: '1', name: 'فلتر اختبار', image: '/brand/aquavo-v2-icon.svg', price: 25000, quantity: 2 }],
        totalItems: 2,
        totalPrice: 50000,
        removeItem: vi.fn(),
        updateQuantity: vi.fn(),
        clearCart: vi.fn(),
    })
}));

vi.mock('@/contexts/auth-context', () => ({
    useAuth: () => ({ user: null, isAuthenticated: false, isLoading: false })
}));

vi.mock('@/contexts/wishlist-context', () => ({
    useWishlist: () => ({ items: [], itemCount: 0 })
}));

import Navbar from '@/components/navbar';

const createWrapper = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            <NavbarPreferencesProvider>{children}</NavbarPreferencesProvider>
        </QueryClientProvider>
    );
};

describe('Navbar Component', () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(() => vi.restoreAllMocks());

    it('should render navbar', () => {
        render(<Navbar />, { wrapper: createWrapper() });
        expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should have navigation links', () => {
        render(<Navbar />, { wrapper: createWrapper() });
        const links = screen.queryAllByRole('link');
        expect(links.length).toBeGreaterThan(0);
    });

    it('should have interactive buttons', () => {
        render(<Navbar />, { wrapper: createWrapper() });
        const buttons = screen.queryAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
    });

    it('shows the focused primary navigation', () => {
        render(<Navbar />, { wrapper: createWrapper() });

        expect(screen.getByRole('link', { name: 'المتجر' })).toBeInTheDocument();
        // Renamed in b864de27 ("canonical journey link"); still the /journey entry.
        expect(screen.getByRole('link', { name: 'اختار حسب حوضك' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'أدلة AQUAVO' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'تتبع طلبك' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'منو AQUAVO' })).toBeInTheDocument();
    });

    it('does not nest links and buttons inside each other', () => {
        const { container } = render(<Navbar />, { wrapper: createWrapper() });

        expect(container.querySelector('a a, a button, button a, button button')).toBeNull();
    });

    it('uses the same checkout route on desktop', async () => {
        const user = await import('@testing-library/user-event').then((module) => module.default.setup());
        render(<Navbar />, { wrapper: createWrapper() });

        await user.click(screen.getByRole('button', { name: /سلة المشتريات/ }));
        await user.click(screen.getByRole('button', { name: 'كمل معلومات التوصيل' }));

        expect(mockSetLocation).toHaveBeenCalledWith('/checkout');
    });
});
