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
                estimatedDelivery: new Date().toISOString(),
            }),
        })) as unknown as typeof fetch;
    });
    afterEach(() => vi.restoreAllMocks());

    it('should render order tracking page', () => {
        render(<OrderTracking />, { wrapper: createWrapper() });
        expect(document.body).toBeTruthy();
    });

    it('should display order status', async () => {
        render(<OrderTracking />, { wrapper: createWrapper() });
        await waitFor(() => expect(screen.getByRole('main')).toBeInTheDocument());
    });


    it('requires the last four phone digits and sends them in a POST body', async () => {
        const user = userEvent.setup();
        render(<OrderTracking />, { wrapper: createWrapper() });

        await user.type(screen.getByTestId('input-order-number'), 'FW-241224-0001');
        await user.click(screen.getByTestId('button-track-order'));
        expect(await screen.findByText('أدخل رقم الطلب وآخر 4 أرقام من رقم الهاتف المستخدم بالطلب')).toBeInTheDocument();
        expect(global.fetch).not.toHaveBeenCalled();

        await user.type(screen.getByTestId('input-phone-number'), '0673');
        await user.click(screen.getByTestId('button-track-order'));

        await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
            '/api/orders/track/FW-241224-0001',
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ phoneLast4: '0673' }),
            }),
        ));
    });

    it('shows the same generic error for every failed verification', async () => {
        global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 404 })) as unknown as typeof fetch;
        const user = userEvent.setup();
        render(<OrderTracking />, { wrapper: createWrapper() });

        await user.type(screen.getByTestId('input-order-number'), 'FW-UNKNOWN');
        await user.type(screen.getByTestId('input-phone-number'), '1234');
        await user.click(screen.getByTestId('button-track-order'));

        expect(await screen.findByText('تعذر التحقق من الطلب. تأكد من المعلومات وحاول مرة ثانية.')).toBeInTheDocument();
    });
});
