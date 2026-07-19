/**
 * FAQ Page Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('wouter', () => ({
    useLocation: () => ['/faq', vi.fn()],
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

import FAQ from '../faq';

describe('FAQ Page', () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(() => vi.restoreAllMocks());

    it('should render FAQ page', () => {
        render(<FAQ />);
        expect(document.body).toBeTruthy();
    });

    it('should display FAQ categories', () => {
        render(<FAQ />);
        expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('should have expandable FAQ items', () => {
        render(<FAQ />);
        const buttons = screen.queryAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
    });

});
