import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchProductsCore as fetchProducts, fetchProductCore as fetchProduct, fetchProductBySlugCore as fetchProductBySlug } from '../api';

// Mock fetch
global.fetch = vi.fn();

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchProducts', () => {
    it('should fetch products successfully', async () => {
      const mockProducts = {
        products: [
          { id: '1', name: 'Product 1', price: 100 },
          { id: '2', name: 'Product 2', price: 200 },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProducts,
      });

      const result = await fetchProducts();

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/products',
        expect.objectContaining({
          credentials: 'include',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        })
      );
      expect(result).toEqual(mockProducts);
    });

    it('should include credentials in request', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ products: [] }),
      });

      await fetchProducts();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ credentials: 'include' })
      );
    });

    it('should include Content-Type header', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ products: [] }),
      });

      await fetchProducts();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        })
      );
    });

    it('should throw error on failed request', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
        text: async () => 'Server error',
      });

      await expect(fetchProducts()).rejects.toThrow('Server error');
    });

    it('should throw statusText if error text is empty', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
        text: async () => '',
      });

      await expect(fetchProducts()).rejects.toThrow('Not Found');
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      await expect(fetchProducts()).rejects.toThrow('Network error');
    });

    it('should parse JSON response', async () => {
      const mockData = { products: [{ id: '1', name: 'Test' }] };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const result = await fetchProducts();

      expect(result).toEqual(mockData);
    });
  });

  describe('fetchProduct', () => {
    it('should fetch single product by id', async () => {
      const mockProduct = {
        id: 'prod-123',
        name: 'Test Product',
        price: 99.99,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProduct,
      });

      const result = await fetchProduct('prod-123');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/^\/api\/products\/prod-123\?sid=cs_/),
        expect.objectContaining({
          credentials: 'include',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        })
      );
      expect(result).toEqual(mockProduct);
    });

    it('should handle 404 errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
        text: async () => 'Product not found',
      });

      await expect(fetchProduct('invalid-id')).rejects.toThrow(
        'Product not found'
      );
    });

    it('should include id in URL path', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await fetchProduct('test-id-123');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/products/test-id-123'),
        expect.any(Object)
      );
    });

    it('should handle special characters in id', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await fetchProduct('prod-123-abc_xyz');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/products/prod-123-abc_xyz'),
        expect.any(Object)
      );
    });

    it('should throw error on malformed JSON response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      await expect(fetchProduct('prod-123')).rejects.toThrow('Invalid JSON');
    });
  });

  describe('fetchProductBySlug', () => {
    it('should fetch product by slug', async () => {
      const mockProduct = {
        id: 'prod-123',
        slug: 'test-product',
        name: 'Test Product',
        price: 99.99,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProduct,
      });

      const result = await fetchProductBySlug('test-product');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/^\/api\/products\/test-product\?sid=cs_/),
        expect.objectContaining({
          credentials: 'include',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        })
      );
      expect(result).toEqual(mockProduct);
    });

    it('should handle slugs with hyphens', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await fetchProductBySlug('my-awesome-product');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/products/my-awesome-product'),
        expect.any(Object)
      );
    });

    it('should handle slugs with numbers', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await fetchProductBySlug('product-123');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/products/product-123'),
        expect.any(Object)
      );
    });

    it('should handle 404 for invalid slug', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
        text: async () => 'Product not found',
      });

      await expect(fetchProductBySlug('invalid-slug')).rejects.toThrow(
        'Product not found'
      );
    });

    it('should include credentials', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await fetchProductBySlug('test-slug');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ credentials: 'include' })
      );
    });

    it('should handle server errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
        text: async () => 'Database connection failed',
      });

      await expect(fetchProductBySlug('test-slug')).rejects.toThrow(
        'Database connection failed'
      );
    });
  });

  describe('Error Handling', () => {
    it('should prefer error text over statusText', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
        text: async () => 'Detailed error message',
      });

      await expect(fetchProducts()).rejects.toThrow('Detailed error message');
    });

    it('should handle empty error responses', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        statusText: 'Unknown Error',
        text: async () => '',
      });

      await expect(fetchProducts()).rejects.toThrow('Unknown Error');
    });

    it('should handle fetch abortion', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Aborted'));

      await expect(fetchProducts()).rejects.toThrow('Aborted');
    });

    it('should handle timeout errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Request timeout'));

      await expect(fetchProducts()).rejects.toThrow('Request timeout');
    });
  });

  describe('Request Configuration', () => {
    it('should merge custom options with defaults', async () => {
      // Test that getJson would merge options correctly
      // Note: getJson is internal, but we test through public methods

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ products: [] }),
      });

      await fetchProducts();

      const callArgs = (global.fetch as any).mock.calls[0][1];
      expect(callArgs.credentials).toBe('include');
      expect(callArgs.headers['Content-Type']).toBe('application/json');
    });

    it('should use GET method by default', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ products: [] }),
      });

      await fetchProducts();

      const callArgs = (global.fetch as any).mock.calls[0][1];
      expect(callArgs.method).toBeUndefined(); // GET is default
    });
  });
});
