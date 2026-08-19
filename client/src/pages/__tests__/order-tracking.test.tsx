/**
 * Order Tracking Page Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('wouter', () => ({
    useLocation: () => ['/order-tracking/FW-241224-0001', vi.fn()],
    useParams: () => ({ orderNumber: 'FW-241224-0001' }),
    useRoute: () => [true, { orderNumber: 'FW-241224-0001' }],
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
    useCart: () => ({ items: [], itemCount: 0 }),
}));

vi.mock('@/contexts/wishlist-context', () => ({
    useWishlist: () => ({ items: [], itemCount: 0 }),
}));

vi.mock('@/contexts/auth-context', () => ({
    useAuth: () => ({ user: null, isAuthenticated: false, isLoading: false }),
}));

import OrderTracking from '../order-tracking';

const createWrapper = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe('Order Tracking Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.fetch = vi.fn(() => Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
                orderNumber: 'FW-241224-0001',
                status: 'processing',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                shipping: null,
            }),
        })) as unknown as typeof fetch;
    });
    afterEach(() => vi.restoreAllMocks());

    it('should render order tracking page', () => {
        render(<OrderTracking />, { wrapper: createWrapper() });
        expect(document.body).toBeTruthy();
        expect(screen.queryByTestId('input-phone-number')).not.toBeInTheDocument();
    });

    it('should display order status', async () => {
        render(<OrderTracking />, { wrapper: createWrapper() });
        await waitFor(() => expect(screen.getByRole('main')).toBeInTheDocument());
    });

    it('tracks with the order number only and sends no phone verifier', async () => {
        const user = userEvent.setup();
        render(<OrderTracking />, { wrapper: createWrapper() });

        await user.type(screen.getByTestId('input-order-number'), 'FW-241224-0001');
        await user.click(screen.getByTestId('button-track-order'));

        await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
            '/api/orders/track/FW-241224-0001',
            {
                method: 'POST',
                credentials: 'include',
            },
        ));
    });

    it('shows a clear error when the order number cannot be found', async () => {
        global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 404 })) as unknown as typeof fetch;
        const user = userEvent.setup();
        render(<OrderTracking />, { wrapper: createWrapper() });

        await user.type(screen.getByTestId('input-order-number'), 'FW-UNKNOWN');
        await user.click(screen.getByTestId('button-track-order'));

        expect(await screen.findByText('تعذر العثور على الطلب. تأكد من رقم الطلب وحاول مرة ثانية.')).toBeInTheDocument();
    });
});
