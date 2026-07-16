/**
 * Product Card Component Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('wouter', () => ({
    useLocation: () => ['/', vi.fn()],
    Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
        <a href={href}>{children}</a>
    ),
}));

vi.mock('@/contexts/cart-context', () => ({
    useCart: () => ({ addItem: vi.fn(), items: [] })
}));

vi.mock('@/contexts/wishlist-context', () => ({
    useWishlist: () => ({
        addItem: vi.fn(),
        removeItem: vi.fn(),
        isInWishlist: vi.fn(() => false)
    })
}));

vi.mock('@/contexts/comparison-context', () => ({
    useComparison: () => ({
        addToCompare: vi.fn(),
        isInCompare: vi.fn(() => false)
    })
}));

import { ProductCard } from '../../products/product-card';

const mockProduct = {
    id: 'prod-1',
    name: 'Premium Fish Food',
    slug: 'premium-fish-food',
    price: 25000,
    originalPrice: 30000,
    image: '/images/fish-food.jpg',
    thumbnail: '/images/fish-food-thumb.jpg',
    images: ['/images/fish-food.jpg'],
    category: 'أطعمة',
    brand: 'Tetra',
    stock: 50,
    rating: 4.5,
    reviewCount: 25,
    isNew: true
};

const createWrapper = () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
};

describe('ProductCard Component', () => {
    beforeEach(() => vi.clearAllMocks());
    afterEach(() => vi.restoreAllMocks());

    it('should render product card', () => {
        render(<ProductCard product={mockProduct} />, { wrapper: createWrapper() });
        expect(screen.getByRole('link')).toBeInTheDocument();
    });

    it('should display product name', () => {
        render(<ProductCard product={mockProduct} />, { wrapper: createWrapper() });
        expect(screen.getByText('Premium Fish Food')).toBeInTheDocument();
    });

    it('should link to product details page', () => {
        render(<ProductCard product={mockProduct} />, { wrapper: createWrapper() });
        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('href', expect.stringContaining('premium-fish-food'));
    });

    it('does not nest buttons inside the product link', () => {
        const { container } = render(<ProductCard product={mockProduct} />, { wrapper: createWrapper() });
        expect(container.querySelector('a button, button a')).not.toBeInTheDocument();
    });

    it('keeps the product image contained and dimensioned', () => {
        render(<ProductCard product={mockProduct} />, { wrapper: createWrapper() });
        const image = screen.getByRole('img', { name: /Premium Fish Food/ });
        expect(image).toHaveAttribute('width', '400');
        expect(image).toHaveAttribute('height', '400');
        expect(image).toHaveClass('object-contain');
    });

    it('uses a direct, calm add-to-cart label', () => {
        render(<ProductCard product={mockProduct} />, { wrapper: createWrapper() });
        expect(screen.getByRole('button', { name: /أضف Premium Fish Food إلى سلة المشتريات/ })).toBeEnabled();
    });

    // ---- Phase D: product-status accessibility ----

    it('exposes meaningful status badges to the accessibility tree (not aria-hidden)', () => {
        const product = { ...mockProduct, isNew: true, isBestSeller: true, ecoFriendly: true };
        render(<ProductCard product={product} />, { wrapper: createWrapper() });

        for (const status of ['جديد', 'الأكثر مبيعاً', 'صديق للبيئة']) {
            const el = screen.getByText(status);
            expect(el).toBeInTheDocument();
            // No ancestor removes it from the accessibility tree.
            expect(el.closest('[aria-hidden="true"]')).toBeNull();
        }
    });

    it('keeps the decorative eco badge icon out of the accessibility tree', () => {
        const product = { ...mockProduct, ecoFriendly: true };
        render(<ProductCard product={product} />, { wrapper: createWrapper() });
        const ecoBadge = screen.getByText('صديق للبيئة').closest('span, div');
        const icon = ecoBadge?.querySelector('svg');
        expect(icon).not.toBeNull();
        expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    // ---- Phase D: compare / wishlist accessible names + touch targets ----

    it('gives the compare control an Arabic accessible name', () => {
        render(<ProductCard product={mockProduct} />, { wrapper: createWrapper() });
        expect(screen.getByRole('button', { name: 'إضافة للمقارنة' })).toBeInTheDocument();
    });

    it('gives the wishlist control an Arabic accessible name', () => {
        render(<ProductCard product={mockProduct} />, { wrapper: createWrapper() });
        expect(screen.getByRole('button', { name: /إضافة Premium Fish Food للمفضلة/ })).toBeInTheDocument();
    });

    it('sizes the compare and wishlist controls to a 44px touch target at every breakpoint', () => {
        render(<ProductCard product={mockProduct} />, { wrapper: createWrapper() });
        const compare = screen.getByRole('button', { name: 'إضافة للمقارنة' });
        const wishlist = screen.getByRole('button', { name: /إضافة Premium Fish Food للمفضلة/ });
        for (const control of [compare, wishlist]) {
            expect(control).toHaveClass('h-11', 'w-11', 'md:h-11', 'md:w-11');
        }
    });
});
