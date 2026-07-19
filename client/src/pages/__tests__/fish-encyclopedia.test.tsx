/**
 * Fish Encyclopedia Page Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('wouter', () => ({
    useLocation: () => ['/fish-encyclopedia', vi.fn()],
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

vi.mock('@/hooks/use-fish-data', () => ({
    useFishData: () => ({
        data: [
            {
                id: '1',
                name: 'Betta',
                nameAr: 'بيتا',
                arabicName: 'سمكة البيتا',
                category: 'Freshwater',
                maxSize: 7,
                temperament: 'peaceful',
                careLevel: 'easy',
                waterParameters: {
                    tempMin: 24,
                    tempMax: 28,
                    phMin: 6.5,
                    phMax: 7.5
                }
            },
            {
                id: '2',
                name: 'Goldfish',
                nameAr: 'سمكة ذهبية',
                arabicName: 'سمكة ذهبية',
                category: 'Freshwater',
                maxSize: 30,
                temperament: 'peaceful',
                careLevel: 'easy',
                waterParameters: {
                    tempMin: 18,
                    tempMax: 24,
                    phMin: 7.0,
                    phMax: 8.0
                }
            }
        ],
        isLoading: false,
        error: null
    })
}));

import FishEncyclopedia from '../fish-encyclopedia';

const createWrapper = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe('Fish Encyclopedia Page', () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(() => vi.restoreAllMocks());

    it('should render encyclopedia page', () => {
        render(<FishEncyclopedia />, { wrapper: createWrapper() });
        expect(document.body).toBeTruthy();
    });

    it('should display page title', () => {
        render(<FishEncyclopedia />, { wrapper: createWrapper() });
        expect(screen.getByText('اكتشف عالم الأسماك')).toBeInTheDocument();
    });

    it('should have search functionality', () => {
        render(<FishEncyclopedia />, { wrapper: createWrapper() });
        expect(screen.getByPlaceholderText(/ابحث بالاسم/)).toBeInTheDocument();
    });

    it('should display fish cards', () => {
        render(<FishEncyclopedia />, { wrapper: createWrapper() });
        expect(screen.getByText('سمكة البيتا')).toBeInTheDocument();
        expect(screen.getByText('سمكة ذهبية')).toBeInTheDocument();
    });

});
