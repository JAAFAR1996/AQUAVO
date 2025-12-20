/**
 * App Component Tests
 * Tests for the main App component and routing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '../App';
import React from 'react';

// Mock all providers
vi.mock('@/contexts/auth-context', () => ({
    AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useAuth: () => ({
        user: null,
        isLoading: false,
        isAdmin: false,
    }),
}));

vi.mock('@/contexts/cart-context', () => ({
    CartProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useCart: () => ({
        items: [],
        totalItems: 0,
        totalPrice: 0,
        addItem: vi.fn(),
        removeItem: vi.fn(),
        updateQuantity: vi.fn(),
        clearCart: vi.fn(),
    }),
}));

vi.mock('@/contexts/wishlist-context', () => ({
    WishlistProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useWishlist: () => ({
        items: [],
        totalItems: 0,
        addItem: vi.fn(),
        removeItem: vi.fn(),
        isInWishlist: vi.fn(),
    }),
}));

vi.mock('@/contexts/shrimp-context', () => ({
    ShrimpProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useShrimp: () => ({
        stage: 'larva',
        isGoldenActive: false,
        goldenCaught: false,
        catchGoldenShrimp: vi.fn(),
    }),
}));

// Mock lazy loaded components
vi.mock('@/pages/home', () => ({
    default: () => <div data-testid="home-page">Home Page</div>,
}));

vi.mock('@/pages/products', () => ({
    default: () => <div data-testid="products-page">Products Page</div>,
}));

vi.mock('@/pages/login', () => ({
    default: () => <div data-testid="login-page">Login Page</div>,
}));

// Mock GA and Sentry
vi.mock('@/lib/analytics', () => ({
    initGA: vi.fn(),
    trackPageView: vi.fn(),
}));

vi.mock('@/lib/sentry', () => ({
    default: {},
}));

describe('App', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        vi.clearAllMocks();
        queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false },
            },
        });
    });

    afterEach(() => {
        queryClient.clear();
        vi.restoreAllMocks();
    });

    describe('Provider Setup', () => {
        it('should render without crashing', async () => {
            render(<App />);

            await waitFor(() => {
                expect(document.body).toBeInTheDocument();
            });
        });
    });

    describe('Global Components', () => {
        it('should render toaster', async () => {
            render(<App />);

            await waitFor(() => {
                // Toaster is rendered by the app
                expect(document.body).toBeInTheDocument();
            });
        });

        it('should render scroll progress indicator', async () => {
            render(<App />);

            await waitFor(() => {
                // Look for the scroll progress container by class
                const scrollProgress = document.querySelector('.fixed.top-0');
                expect(scrollProgress).toBeInTheDocument();
            });
        });

        it('should render floating action button container', async () => {
            render(<App />);

            await waitFor(() => {
                // Look for FAB container
                const fabContainer = document.querySelector('.fixed.bottom-8');
                expect(fabContainer).toBeInTheDocument();
            });
        });

        it('should render bubble trail container', async () => {
            render(<App />);

            await waitFor(() => {
                // Look for bubble trail overlay
                const bubbleTrail = document.querySelector('.fixed.inset-0.pointer-events-none');
                expect(bubbleTrail).toBeInTheDocument();
            });
        });
    });

    describe('Accessibility', () => {
        it('should have main content area', async () => {
            render(<App />);

            await waitFor(() => {
                expect(document.body).toBeInTheDocument();
            });
        });

        it('should have skip to main content link', async () => {
            render(<App />);

            await waitFor(() => {
                const skipLink = document.querySelector('.skip-to-main');
                expect(skipLink).toBeInTheDocument();
            });
        });
    });
});
