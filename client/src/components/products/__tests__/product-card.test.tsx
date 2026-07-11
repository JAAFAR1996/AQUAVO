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
});
