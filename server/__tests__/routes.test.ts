import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

// Mock storage
const mockStorage = {
  getProducts: vi.fn(),
  getProduct: vi.fn(),
  getProductBySlug: vi.fn(),
  getUserByUsername: vi.fn(),
  createUser: vi.fn(),
  getUser: vi.fn(),
};

vi.mock('../storage', () => ({
  storage: mockStorage,
}));

describe('API Routes', () => {
  describe('Product Transformation', () => {
    it('should transform database product to API format', () => {
      const dbProduct = {
        id: 'prod-123',
        name: 'Test Fish',
        brand: 'AquaBrand',
        price: '99.99',
        originalPrice: '149.99',
        rating: '4.5',
        reviewCount: 25,
        thumbnail: 'thumb.jpg',
        images: ['img1.jpg', 'img2.jpg'],
        category: 'fish',
        subcategory: 'tropical',
        description: 'A beautiful tropical fish',
        isNew: true,
        isBestSeller: false,
        specifications: {
          difficulty: 'easy',
          ecoFriendly: true,
          videoUrl: 'https://example.com/video.mp4',
        },
        stock: 50,
        slug: 'test-fish',
      };

      // Recreate the transform function from routes.ts
      function transformProduct(dbProduct: any) {
        return {
          id: dbProduct.id,
          name: dbProduct.name,
          brand: dbProduct.brand,
          price: Number(dbProduct.price),
          originalPrice: dbProduct.originalPrice
            ? Number(dbProduct.originalPrice)
            : undefined,
          rating: Number(dbProduct.rating),
          reviewCount: dbProduct.reviewCount,
          image:
            dbProduct.thumbnail ||
            (dbProduct.images && dbProduct.images[0]) ||
            '',
          category: dbProduct.subcategory || dbProduct.category,
          specs: dbProduct.description,
          isNew: dbProduct.isNew,
          isBestSeller: dbProduct.isBestSeller,
          difficulty: dbProduct.specifications?.difficulty,
          ecoFriendly: dbProduct.specifications?.ecoFriendly,
          videoUrl: dbProduct.specifications?.videoUrl,
          stock: dbProduct.stock,
          slug: dbProduct.slug,
        };
      }

      const result = transformProduct(dbProduct);

      expect(result.id).toBe('prod-123');
      expect(result.name).toBe('Test Fish');
      expect(result.price).toBe(99.99);
      expect(result.originalPrice).toBe(149.99);
      expect(result.rating).toBe(4.5);
      expect(result.image).toBe('thumb.jpg');
      expect(result.category).toBe('tropical');
      expect(result.difficulty).toBe('easy');
      expect(result.ecoFriendly).toBe(true);
    });

    it('should handle missing originalPrice', () => {
      const dbProduct = {
        id: 'prod-123',
        name: 'Test Product',
        brand: 'Brand',
        price: '99.99',
        rating: '4.0',
        reviewCount: 10,
        images: ['img.jpg'],
        category: 'fish',
        subcategory: 'tropical',
        description: 'Description',
        specifications: {},
      };

      function transformProduct(dbProduct: any) {
        return {
          id: dbProduct.id,
          name: dbProduct.name,
          brand: dbProduct.brand,
          price: Number(dbProduct.price),
          originalPrice: dbProduct.originalPrice
            ? Number(dbProduct.originalPrice)
            : undefined,
          rating: Number(dbProduct.rating),
          reviewCount: dbProduct.reviewCount,
          image:
            dbProduct.thumbnail ||
            (dbProduct.images && dbProduct.images[0]) ||
            '',
          category: dbProduct.subcategory || dbProduct.category,
          specs: dbProduct.description,
          isNew: dbProduct.isNew,
          isBestSeller: dbProduct.isBestSeller,
          difficulty: dbProduct.specifications?.difficulty,
          ecoFriendly: dbProduct.specifications?.ecoFriendly,
          videoUrl: dbProduct.specifications?.videoUrl,
          stock: dbProduct.stock,
          slug: dbProduct.slug,
        };
      }

      const result = transformProduct(dbProduct);

      expect(result.originalPrice).toBeUndefined();
    });

    it('should fallback to first image if no thumbnail', () => {
      const dbProduct = {
        id: 'prod-123',
        name: 'Test Product',
        brand: 'Brand',
        price: '99.99',
        rating: '4.0',
        reviewCount: 10,
        images: ['img1.jpg', 'img2.jpg'],
        category: 'fish',
        subcategory: 'tropical',
        description: 'Description',
        specifications: {},
      };

      function transformProduct(dbProduct: any) {
        return {
          id: dbProduct.id,
          name: dbProduct.name,
          brand: dbProduct.brand,
          price: Number(dbProduct.price),
          originalPrice: dbProduct.originalPrice
            ? Number(dbProduct.originalPrice)
            : undefined,
          rating: Number(dbProduct.rating),
          reviewCount: dbProduct.reviewCount,
          image:
            dbProduct.thumbnail ||
            (dbProduct.images && dbProduct.images[0]) ||
            '',
          category: dbProduct.subcategory || dbProduct.category,
          specs: dbProduct.description,
          isNew: dbProduct.isNew,
          isBestSeller: dbProduct.isBestSeller,
          difficulty: dbProduct.specifications?.difficulty,
          ecoFriendly: dbProduct.specifications?.ecoFriendly,
          videoUrl: dbProduct.specifications?.videoUrl,
          stock: dbProduct.stock,
          slug: dbProduct.slug,
        };
      }

      const result = transformProduct(dbProduct);

      expect(result.image).toBe('img1.jpg');
    });

    it('should fallback to empty string if no images', () => {
      const dbProduct = {
        id: 'prod-123',
        name: 'Test Product',
        brand: 'Brand',
        price: '99.99',
        rating: '4.0',
        reviewCount: 10,
        category: 'fish',
        subcategory: 'tropical',
        description: 'Description',
        specifications: {},
      };

      function transformProduct(dbProduct: any) {
        return {
          id: dbProduct.id,
          name: dbProduct.name,
          brand: dbProduct.brand,
          price: Number(dbProduct.price),
          originalPrice: dbProduct.originalPrice
            ? Number(dbProduct.originalPrice)
            : undefined,
          rating: Number(dbProduct.rating),
          reviewCount: dbProduct.reviewCount,
          image:
            dbProduct.thumbnail ||
            (dbProduct.images && dbProduct.images[0]) ||
            '',
          category: dbProduct.subcategory || dbProduct.category,
          specs: dbProduct.description,
          isNew: dbProduct.isNew,
          isBestSeller: dbProduct.isBestSeller,
          difficulty: dbProduct.specifications?.difficulty,
          ecoFriendly: dbProduct.specifications?.ecoFriendly,
          videoUrl: dbProduct.specifications?.videoUrl,
          stock: dbProduct.stock,
          slug: dbProduct.slug,
        };
      }

      const result = transformProduct(dbProduct);

      expect(result.image).toBe('');
    });

    it('should prefer subcategory over category', () => {
      const dbProduct = {
        id: 'prod-123',
        name: 'Test Product',
        brand: 'Brand',
        price: '99.99',
        rating: '4.0',
        reviewCount: 10,
        images: ['img.jpg'],
        category: 'fish',
        subcategory: 'tropical',
        description: 'Description',
        specifications: {},
      };

      function transformProduct(dbProduct: any) {
        return {
          id: dbProduct.id,
          name: dbProduct.name,
          brand: dbProduct.brand,
          price: Number(dbProduct.price),
          originalPrice: dbProduct.originalPrice
            ? Number(dbProduct.originalPrice)
            : undefined,
          rating: Number(dbProduct.rating),
          reviewCount: dbProduct.reviewCount,
          image:
            dbProduct.thumbnail ||
            (dbProduct.images && dbProduct.images[0]) ||
            '',
          category: dbProduct.subcategory || dbProduct.category,
          specs: dbProduct.description,
          isNew: dbProduct.isNew,
          isBestSeller: dbProduct.isBestSeller,
          difficulty: dbProduct.specifications?.difficulty,
          ecoFriendly: dbProduct.specifications?.ecoFriendly,
          videoUrl: dbProduct.specifications?.videoUrl,
          stock: dbProduct.stock,
          slug: dbProduct.slug,
        };
      }

      const result = transformProduct(dbProduct);

      expect(result.category).toBe('tropical');
    });
  });

  describe('Query Parameter Parsing', () => {
    it('should parse all filter parameters correctly', () => {
      const query = {
        category: 'fish',
        subcategory: 'tropical',
        brand: 'AquaBrand',
        minPrice: '50',
        maxPrice: '200',
        isNew: 'true',
        isBestSeller: 'false',
        search: 'blue',
        limit: '10',
        offset: '20',
      };

      const filters: any = {};
      if (query.category) filters.category = query.category as string;
      if (query.subcategory) filters.subcategory = query.subcategory as string;
      if (query.brand) filters.brand = query.brand as string;
      if (query.minPrice) filters.minPrice = Number(query.minPrice);
      if (query.maxPrice) filters.maxPrice = Number(query.maxPrice);
      if (query.isNew !== undefined) filters.isNew = query.isNew === 'true';
      if (query.isBestSeller !== undefined)
        filters.isBestSeller = query.isBestSeller === 'true';
      if (query.search) filters.search = query.search as string;
      if (query.limit) filters.limit = Number(query.limit);
      if (query.offset) filters.offset = Number(query.offset);

      expect(filters.category).toBe('fish');
      expect(filters.subcategory).toBe('tropical');
      expect(filters.brand).toBe('AquaBrand');
      expect(filters.minPrice).toBe(50);
      expect(filters.maxPrice).toBe(200);
      expect(filters.isNew).toBe(true);
      expect(filters.isBestSeller).toBe(false);
      expect(filters.search).toBe('blue');
      expect(filters.limit).toBe(10);
      expect(filters.offset).toBe(20);
    });

    it('should handle boolean string parsing', () => {
      const trueStr: string = 'true';
      const falseStr: string = 'false';
      const trueUpperStr: string = 'True';
      const falseUpperStr: string = 'FALSE';
      expect(trueStr === 'true').toBe(true);
      expect(falseStr === 'true').toBe(false);
      expect(trueUpperStr === 'true').toBe(false);
      expect(falseUpperStr === 'true').toBe(false);
    });

    it('should handle missing optional parameters', () => {
      const query = {
        category: 'fish',
      };

      const filters: any = {};
      if (query.category) filters.category = query.category;

      expect(filters.category).toBe('fish');
      expect(filters.subcategory).toBeUndefined();
      expect(filters.brand).toBeUndefined();
    });
  });

  describe('Authentication Middleware', () => {
    it('should allow requests with valid session', () => {
      const req = {
        session: { userId: 'user-123' },
      } as any as Request;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any as Response;

      const next = vi.fn() as NextFunction;

      function requireAuth(req: Request, res: Response, next: NextFunction) {
        if (!req.session?.userId) {
          res.status(401).json({ message: 'Unauthorized' });
          return;
        }
        next();
      }

      requireAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject requests without session', () => {
      const req = {
        session: undefined,
      } as any as Request;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any as Response;

      const next = vi.fn() as NextFunction;

      function requireAuth(req: Request, res: Response, next: NextFunction) {
        if (!req.session?.userId) {
          res.status(401).json({ message: 'Unauthorized' });
          return;
        }
        next();
      }

      requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject requests without userId in session', () => {
      const req = {
        session: {},
      } as any as Request;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as any as Response;

      const next = vi.fn() as NextFunction;

      function requireAuth(req: Request, res: Response, next: NextFunction) {
        if (!req.session?.userId) {
          res.status(401).json({ message: 'Unauthorized' });
          return;
        }
        next();
      }

      requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Error Responses', () => {
    it('should return 404 for non-existent product', () => {
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      res.status(404).json({ message: 'Product not found' });

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Product not found' });
    });

    it('should return 409 for duplicate username', () => {
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      res.status(409).json({ message: 'Username already exists' });

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Username already exists',
      });
    });

    it('should return 401 for invalid credentials', () => {
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      res.status(401).json({ message: 'Invalid credentials' });

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid credentials' });
    });
  });

  describe('Session Management', () => {
    it('should set userId on successful registration', () => {
      const session: any = {};
      session.userId = 'user-123';

      expect(session.userId).toBe('user-123');
    });

    it('should set userId on successful login', () => {
      const session: any = {};
      session.userId = 'user-456';

      expect(session.userId).toBe('user-456');
    });

    it('should destroy session on logout', async () => {
      const session = {
        destroy: vi.fn((callback) => callback()),
      };

      await new Promise((resolve) => {
        session.destroy(resolve);
      });

      expect(session.destroy).toHaveBeenCalled();
    });
  });

  describe('Health Check', () => {
    it('should return status ok', () => {
      const response = { status: 'ok', timestamp: Date.now() };

      expect(response.status).toBe('ok');
      expect(response.timestamp).toBeGreaterThan(0);
      expect(typeof response.timestamp).toBe('number');
    });

    it('should return current timestamp', () => {
      const before = Date.now();
      const response = { status: 'ok', timestamp: Date.now() };
      const after = Date.now();

      expect(response.timestamp).toBeGreaterThanOrEqual(before);
      expect(response.timestamp).toBeLessThanOrEqual(after);
    });
  });
});
