/**
 * Cart Drawer Accessibility Tests (Phase F)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { NavbarPreferencesProvider } from '@/hooks/use-navbar-preferences';

const mockSetLocation = vi.hoisted(() => vi.fn());
const mockUpdateQuantity = vi.hoisted(() => vi.fn());
const mockRemoveItem = vi.hoisted(() => vi.fn());

vi.mock('wouter', () => ({
    useLocation: () => ['/', mockSetLocation],
    Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href}>{children}</a>
    ),
}));

vi.mock('@/contexts/cart-context', () => ({
    useCart: () => ({
        items: [
            { id: '1', productId: '1', name: 'فلتر اختبار', image: '/brand/aquavo-v2-icon.svg', price: 25000, quantity: 2 },
        ],
        totalItems: 2,
        totalPrice: 50000,
        removeItem: mockRemoveItem,
        updateQuantity: mockUpdateQuantity,
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

describe('Cart drawer accessibility', () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(() => vi.restoreAllMocks());

    it('exposes accessible names for quantity and remove controls', async () => {
        const user = await import('@testing-library/user-event').then((module) => module.default.setup());
        render(<Navbar />, { wrapper: createWrapper() });

        await user.click(screen.getByRole('button', { name: /سلة المشتريات/ }));

        expect(screen.getByRole('button', { name: 'تقليل كمية فلتر اختبار' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'زيادة كمية فلتر اختبار' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'إزالة فلتر اختبار من السلة' })).toBeInTheDocument();
    });

    it('renders cart items as a list with a discernible accessible name per item', async () => {
        const user = await import('@testing-library/user-event').then((module) => module.default.setup());
        render(<Navbar />, { wrapper: createWrapper() });

        await user.click(screen.getByRole('button', { name: /سلة المشتريات/ }));

        const list = screen.getByRole('list', { name: 'المنتجات في السلة' });
        expect(list).toBeInTheDocument();
        const [item] = screen.getAllByRole('listitem');
        expect(item).toHaveAccessibleName(/فلتر اختبار/);
        expect(item).toHaveAccessibleName(/الكمية 2/);
    });

    it('hides the decorative product thumbnail from assistive tech', async () => {
        const user = await import('@testing-library/user-event').then((module) => module.default.setup());
        render(<Navbar />, { wrapper: createWrapper() });

        await user.click(screen.getByRole('button', { name: /سلة المشتريات/ }));

        const image = screen.getByRole('listitem').querySelector('img');
        expect(image).toHaveAttribute('alt', '');
        expect(image).toHaveAttribute('aria-hidden', 'true');
    });

    it('applies 44x44 minimum touch targets to quantity and remove controls', async () => {
        const user = await import('@testing-library/user-event').then((module) => module.default.setup());
        render(<Navbar />, { wrapper: createWrapper() });

        await user.click(screen.getByRole('button', { name: /سلة المشتريات/ }));

        const decreaseBtn = screen.getByRole('button', { name: 'تقليل كمية فلتر اختبار' });
        const increaseBtn = screen.getByRole('button', { name: 'زيادة كمية فلتر اختبار' });
        const removeBtn = screen.getByRole('button', { name: 'إزالة فلتر اختبار من السلة' });

        for (const btn of [decreaseBtn, increaseBtn, removeBtn]) {
            expect(btn.className).toMatch(/h-11/);
            expect(btn.className).toMatch(/w-11/);
            expect(btn.className).toMatch(/md:h-11/);
            expect(btn.className).toMatch(/md:w-11/);
        }
    });

    it('associates the total label with its value via a description list', async () => {
        const user = await import('@testing-library/user-event').then((module) => module.default.setup());
        render(<Navbar />, { wrapper: createWrapper() });

        await user.click(screen.getByRole('button', { name: /سلة المشتريات/ }));

        expect(screen.getByText('المجموع').tagName).toBe('DT');
        const total = screen.getByText((_, el) => el?.tagName === 'DD' && el.textContent?.includes('50,000') === true);
        expect(total).toBeInTheDocument();
    });
});
