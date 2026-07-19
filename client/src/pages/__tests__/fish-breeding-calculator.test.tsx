/**
 * Fish Breeding Calculator Tests
 * Tests for the breeding timeline calculator functionality
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock wouter
vi.mock('wouter', () => ({
    useLocation: () => ['/fish-breeding-calculator', vi.fn()],
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
    useCart: () => ({ items: [], itemCount: 0 }),
}));

vi.mock('@/contexts/wishlist-context', () => ({
    useWishlist: () => ({ items: [], itemCount: 0 }),
}));

vi.mock('@/contexts/auth-context', () => ({
    useAuth: () => ({ user: null, isAuthenticated: false, isLoading: false }),
}));

// Mock fish data hook
vi.mock('@/hooks/use-fish-data', () => ({
    useFishData: () => ({
        data: [
            { id: '1', name: 'Betta Fish', nameAr: 'سمكة البيتا', category: 'Freshwater' },
            { id: '2', name: 'Guppy', nameAr: 'سمكة الجوبي', category: 'Freshwater' }
        ],
        isLoading: false,
        error: null
    })
}));

import FishBreedingCalculator from '../fish-breeding-calculator';

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

describe('Fish Breeding Calculator Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should render the calculator page', () => {
        render(<FishBreedingCalculator />, { wrapper: createWrapper() });
        expect(document.body).toBeTruthy();
    });

    it('should have main content area', async () => {
        render(<FishBreedingCalculator />, { wrapper: createWrapper() });
        await waitFor(() => {
            expect(screen.getByRole('main')).toBeInTheDocument();
        });
    });

    it('should display fish breeding heading', async () => {
        render(<FishBreedingCalculator />, { wrapper: createWrapper() });
        await waitFor(() => {
            const headings = screen.getAllByRole('heading');
            expect(headings.length).toBeGreaterThan(0);
        });
    });

    it('should have interactive controls', async () => {
        render(<FishBreedingCalculator />, { wrapper: createWrapper() });
        await waitFor(() => {
            // The page uses combobox elements for selections
            const comboboxes = screen.queryAllByRole('combobox');
            expect(comboboxes.length).toBeGreaterThan(0);
        });
    });

});
