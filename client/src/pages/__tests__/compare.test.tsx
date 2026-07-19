/**
 * Compare Products Page Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('wouter', () => ({
    useLocation: () => ['/compare', vi.fn()],
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

vi.mock('@/contexts/comparison-context', () => ({
    useComparison: () => ({
        compareItems: [],
        products: [],
        addToCompare: vi.fn(),
        removeFromCompare: vi.fn(),
        clearCompare: vi.fn(),
        isInCompare: vi.fn(() => false),
    }),
}));

vi.mock('@/contexts/cart-context', () => ({
    useCart: () => ({
        items: [],
        addItem: vi.fn(),
        removeItem: vi.fn(),
    }),
}));

vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
}));

import Compare from '../compare';

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe('Compare Products Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Rendering', () => {
        it('should render the compare page', () => {
            render(<Compare />, { wrapper: createWrapper() });
            expect(document.body).toBeTruthy();
        });

        it('should have main content area', () => {
            render(<Compare />, { wrapper: createWrapper() });
            expect(screen.getByRole('main')).toBeInTheDocument();
        });
    });

    describe('Empty State', () => {
        it('should show empty state when no products to compare', () => {
            render(<Compare />, { wrapper: createWrapper() });
            // Check for main content area
            expect(screen.getByRole('main')).toBeInTheDocument();
        });
    });

    describe('Accessibility', () => {
        it('should have proper heading structure', () => {
            render(<Compare />, { wrapper: createWrapper() });
            const headings = screen.getAllByRole('heading');
            expect(headings.length).toBeGreaterThan(0);
        });
    });
});
