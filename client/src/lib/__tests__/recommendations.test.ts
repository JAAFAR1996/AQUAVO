/**
 * Recommendations API Tests
 * Tests for product recommendation functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchTrendingProducts, fetchFrequentlyBoughtTogether, fetchSimilarProducts } from '../recommendations';

// Mock the queryClient apiRequest
vi.mock('../queryClient', () => ({
    apiRequest: vi.fn(),
}));

import { apiRequest } from '../queryClient';

const mockServerProducts = [
    {
        id: 'prod-1',
        slug: 'product-1',
        name: 'Product 1',
        brand: 'Brand A',
        price: '25000',
        originalPrice: '30000',
        description: 'Test description',
        rating: '4.5',
        reviewCount: '10',
        thumbnail: '/img1.jpg',
        images: ['/img1.jpg', '/img2.jpg'],
        category: 'أطعمة',
        stock: '50',
        lowStockThreshold: '10',
        isNew: true,
        isBestSeller: false,
    },
    {
        id: 'prod-2',
        slug: 'product-2',
        name: 'Product 2',
        brand: 'Brand B',
        price: 15000, // Number format
        rating: 4.0, // Number format
        reviewCount: 5,
        thumbnail: '/img3.jpg',
        images: ['/img3.jpg'],
        category: 'فلاتر',
        stock: 100,
    },
];

describe('Recommendations API', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('fetchTrendingProducts', () => {
        it('should fetch trending products and map to client format', async () => {
            (apiRequest as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                json: () => Promise.resolve(mockServerProducts),
            });

            const result = await fetchTrendingProducts();

            expect(apiRequest).toHaveBeenCalledWith('GET', '/api/products/info/trending');
            expect(result).toHaveLength(2);

            // Check first product is properly mapped
            expect(result[0]).toMatchObject({
                id: 'prod-1',
                price: 25000, // Converted to number
                originalPrice: 30000, // Converted to number
                rating: 4.5, // Converted to number
                reviewCount: 10, // Converted to number
                stock: 50, // Converted to number
            });
        });

        it('should handle products with numeric values', async () => {
            (apiRequest as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                json: () => Promise.resolve([mockServerProducts[1]]),
            });

            const result = await fetchTrendingProducts();

            expect(result[0].price).toBe(15000);
            expect(result[0].rating).toBe(4);
        });

        it('should handle empty response', async () => {
            (apiRequest as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                json: () => Promise.resolve([]),
            });

            const result = await fetchTrendingProducts();

            expect(result).toEqual([]);
        });

        it('should handle API errors', async () => {
            (apiRequest as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
                new Error('Network error')
            );

            await expect(fetchTrendingProducts()).rejects.toThrow('Network error');
        });
    });

    describe('fetchFrequentlyBoughtTogether', () => {
        it('should fetch frequently bought together products', async () => {
            (apiRequest as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                json: () => Promise.resolve(mockServerProducts),
            });

            const result = await fetchFrequentlyBoughtTogether('prod-123');

            expect(apiRequest).toHaveBeenCalledWith(
                'GET',
                '/api/products/prod-123/frequently-bought-together'
            );
            expect(result).toHaveLength(2);
        });

        it('should include product ID in URL', async () => {
            (apiRequest as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                json: () => Promise.resolve([]),
            });

            await fetchFrequentlyBoughtTogether('test-product-id');

            expect(apiRequest).toHaveBeenCalledWith(
                'GET',
                '/api/products/test-product-id/frequently-bought-together'
            );
        });

        it('should handle empty results', async () => {
            (apiRequest as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                json: () => Promise.resolve([]),
            });

            const result = await fetchFrequentlyBoughtTogether('prod-123');

            expect(result).toEqual([]);
        });
    });

    describe('fetchSimilarProducts', () => {
        it('should fetch similar products', async () => {
            (apiRequest as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                json: () => Promise.resolve(mockServerProducts),
            });

            const result = await fetchSimilarProducts('prod-123');

            expect(apiRequest).toHaveBeenCalledWith(
                'GET',
                '/api/products/prod-123/similar'
            );
            expect(result).toHaveLength(2);
        });

        it('should handle products with missing optional fields', async () => {
            const minimalProduct = {
                id: 'minimal-prod',
                slug: 'minimal',
                name: 'Minimal Product',
                brand: 'Brand',
                price: '10000',
                thumbnail: '/img.jpg',
                images: [],
                category: 'Test',
            };

            (apiRequest as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                json: () => Promise.resolve([minimalProduct]),
            });

            const result = await fetchSimilarProducts('prod-123');

            expect(result[0]).toMatchObject({
                id: 'minimal-prod',
                price: 10000,
                rating: 0, // Default value
                reviewCount: 0, // Default value
                stock: 0, // Default value
                lowStockThreshold: 0, // Default value
            });
        });
    });

    describe('Data Mapping', () => {
        it('should map string prices to numbers', async () => {
            const productWithStringPrice = {
                ...mockServerProducts[0],
                price: '99999',
                originalPrice: '120000',
            };

            (apiRequest as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                json: () => Promise.resolve([productWithStringPrice]),
            });

            const result = await fetchTrendingProducts();

            expect(typeof result[0].price).toBe('number');
            expect(result[0].price).toBe(99999);
            expect(result[0].originalPrice).toBe(120000);
        });

        it('should handle undefined originalPrice', async () => {
            const productWithoutOriginal = {
                ...mockServerProducts[0],
                originalPrice: undefined,
            };

            (apiRequest as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                json: () => Promise.resolve([productWithoutOriginal]),
            });

            const result = await fetchTrendingProducts();

            expect(result[0].originalPrice).toBeUndefined();
        });

        it('should default rating to 0 if missing', async () => {
            const productWithoutRating = {
                ...mockServerProducts[0],
                rating: undefined,
            };

            (apiRequest as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                json: () => Promise.resolve([productWithoutRating]),
            });

            const result = await fetchTrendingProducts();

            expect(result[0].rating).toBe(0);
        });
    });
});
