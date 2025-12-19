import { type Product, type Review, type ReviewRating, type Discount, type FishSpecies, products, reviews, reviewRatings, discounts, fishSpecies, categories, orderItems, orders } from "../../shared/schema.js";
import { eq, desc, and, gte, lte, sql, isNull, notInArray, gt, inArray, or } from "drizzle-orm";
import { getDb } from "../db.js";
import { randomUUID } from "crypto";

export interface ProductFilters {
    category?: string | string[];
    subcategory?: string;
    brand?: string | string[];
    minPrice?: number;
    maxPrice?: number;
    isNew?: boolean;
    isBestSeller?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'rating' | 'price' | 'createdAt' | 'reviewCount' | 'name';
    sortOrder?: 'asc' | 'desc';
}

export class ProductStorage {
    private db = getDb();

    private ensureDb() {
        if (!this.db) {
            const error = new Error('Database service unavailable. Please try again later.');
            (error as any).status = 503;
            // Log this strictly
            console.error("[ProductStorage] Database connection missing/failed");
            throw error;
        }
        return this.db;
    }


    async getProducts(filters?: ProductFilters): Promise<Product[]> {
        const db = this.ensureDb();
        let query = db.select().from(products);

        const conditions = [];

        // Category Filter (Support string or array)
        if (filters?.category) {
            const categories = Array.isArray(filters.category) ? filters.category : [filters.category];
            if (categories.length > 0) {
                // Using valid categories from DB, so exact match is fine and allows index usage
                conditions.push(inArray(products.category, categories));
            }
        }
        if (filters?.subcategory) conditions.push(sql`lower(${products.subcategory}) = lower(${filters.subcategory})`);

        // Brand Filter (Support string or array)
        if (filters?.brand) {
            const brands = Array.isArray(filters.brand) ? filters.brand : [filters.brand];
            if (brands.length > 0) {
                conditions.push(inArray(products.brand, brands));
            }
        }

        if (filters?.isNew !== undefined) conditions.push(eq(products.isNew, filters.isNew));

        // Relaxed Best Seller Logic: Include manually flagged OR high rated items OR Top Sales (Smart)
        if (filters?.isBestSeller === true) {
            // Fetch real sales data
            const topSalesIds = await this.getHighSalesProductIds(20);

            conditions.push(or(
                eq(products.isBestSeller, true),
                topSalesIds.length > 0 ? inArray(products.id, topSalesIds) : undefined,
                and(gt(products.rating, '4.0'), gt(products.reviewCount, 0))
            ));
        } else if (filters?.isBestSeller === false) {
            conditions.push(eq(products.isBestSeller, false));
        }

        if (filters?.minPrice) conditions.push(gte(products.price, filters.minPrice.toString()));
        if (filters?.maxPrice) conditions.push(lte(products.price, filters.maxPrice.toString()));

        if (filters?.search) {
            const searchTerm = `%${filters.search}%`;
            conditions.push(
                sql`(${products.name} ILIKE ${searchTerm} OR ${products.description} ILIKE ${searchTerm})`
            );
        }

        // Ensure soft deleted products are hidden
        conditions.push(isNull(products.deletedAt));

        if (conditions.length > 0) {
            query = query.where(and(...conditions)) as any;
        }

        // Apply sorting
        if (filters?.sortBy) {
            const sortColumn = filters.sortBy === 'rating' ? products.rating :
                filters.sortBy === 'price' ? products.price :
                    filters.sortBy === 'reviewCount' ? products.reviewCount :
                        filters.sortBy === 'name' ? products.name :
                            products.createdAt;

            query = filters.sortOrder === 'asc'
                ? query.orderBy(sortColumn) as any
                : query.orderBy(desc(sortColumn)) as any;
        } else {
            query = query.orderBy(desc(products.createdAt)) as any;
        }

        if (filters?.limit) {
            query = query.limit(filters.limit) as any;
        }
        if (filters?.offset) {
            query = query.offset(filters.offset) as any;
        }

        return await query;
    }

    async getProductAttributes(): Promise<{ categories: string[], brands: string[], minPrice: number, maxPrice: number }> {
        const db = this.ensureDb();

        // Fetch categories from the dedicated table
        const categoryResults = await db.select({ name: categories.name })
            .from(categories)
            .orderBy(categories.name);

        // Fetch unique brands from products table
        const brandResults = await db.selectDistinct({ brand: products.brand })
            .from(products)
            .where(isNull(products.deletedAt))
            .orderBy(products.brand);

        // Fetch price range
        const priceStats = await db.select({
            min: sql<string>`min(${products.price})`,
            max: sql<string>`max(${products.price})`
        }).from(products).where(isNull(products.deletedAt));

        return {
            categories: categoryResults.map(c => c.name).filter(Boolean),
            brands: brandResults.map(b => b.brand).filter(Boolean),
            minPrice: Number(priceStats[0]?.min || 0),
            maxPrice: Number(priceStats[0]?.max || 1000000)
        };
    }

    async getProduct(id: string): Promise<Product | undefined> {
        const db = this.ensureDb();
        const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
        return result[0];
    }

    async getProductBySlug(slug: string): Promise<Product | undefined> {
        const db = this.ensureDb();
        const result = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
        return result[0];
    }

    private async resolveCategoryId(categoryName: string): Promise<string | undefined> {
        if (!categoryName) return undefined;
        const db = this.ensureDb();

        // 1. Try to find existing category
        const existing = await db.select().from(categories)
            .where(sql`lower(${categories.name}) = lower(${categoryName})`)
            .limit(1);

        if (existing.length > 0) {
            return existing[0].id;
        }

        // 2. If not found, create it (Auto-seed for migration)
        try {
            const newCategory = await db.insert(categories).values({
                name: categoryName,
                displayName: categoryName, // Fallback to same name
                slug: categoryName.toLowerCase().replace(/\s+/g, '-'),
                description: `Auto-generated category for ${categoryName}`
            }).returning();
            return newCategory[0].id;
        } catch (e) {
            // Check for race condition or unique constraint error, retry fetch
            const retry = await db.select().from(categories)
                .where(sql`lower(${categories.name}) = lower(${categoryName})`)
                .limit(1);
            return retry[0]?.id;
        }
    }

    private async ensureUniqueSlug(slug: string, excludeId?: string): Promise<string> {
        const db = this.ensureDb();
        let currentSlug = slug;
        let counter = 1;

        while (true) {
            const conditions = [eq(products.slug, currentSlug)];
            if (excludeId) {
                conditions.push(sql`${products.id} != ${excludeId}`);
            }

            const existing = await db.select().from(products)
                .where(and(...conditions))
                .limit(1);

            if (existing.length === 0) {
                return currentSlug;
            }

            currentSlug = `${slug}-${counter}`;
            counter++;
        }
    }

    async createProduct(product: Partial<Product>): Promise<Product> {
        const db = this.ensureDb();
        // Dual Write Logic: Ensure categoryId is set if category is provided
        if (product.category && !product.categoryId) {
            product.categoryId = await this.resolveCategoryId(product.category) || null;
        }

        // Ensure unique slug
        if (product.slug) {
            product.slug = await this.ensureUniqueSlug(product.slug);
        }

        // Sanitize numeric fields - convert empty strings to undefined
        const sanitizedProduct = {
            ...product,
            id: product.id || randomUUID(),
            price: product.price === '' ? undefined : product.price,
            originalPrice: product.originalPrice === '' ? undefined : product.originalPrice,
            rating: product.rating === '' ? '0' : product.rating,
        };

        const result = await db.insert(products).values(sanitizedProduct as any).returning();
        return result[0];
    }

    async updateProduct(id: string, updates: Partial<Product>): Promise<Product | undefined> {
        const db = this.ensureDb();
        // Dual Write Logic: Update categoryId if category changes
        if (updates.category) {
            const newCategoryId = await this.resolveCategoryId(updates.category);
            if (newCategoryId) {
                updates.categoryId = newCategoryId;
            }
        }

        // Ensure unique slug if it's being updated
        if (updates.slug) {
            updates.slug = await this.ensureUniqueSlug(updates.slug, id);
        }

        // Sanitize numeric fields - convert empty strings to undefined
        const sanitizedUpdates = { ...updates };
        if (sanitizedUpdates.price === '') sanitizedUpdates.price = undefined;
        if (sanitizedUpdates.originalPrice === '') sanitizedUpdates.originalPrice = undefined;
        if (sanitizedUpdates.rating === '') sanitizedUpdates.rating = '0';

        const result = await db.update(products).set({ ...sanitizedUpdates, updatedAt: new Date() } as any).where(eq(products.id, id)).returning();
        return result[0];
    }

    async deleteProduct(id: string): Promise<boolean> {
        const db = this.ensureDb();
        // Soft delete
        const result = await db.update(products)
            .set({ deletedAt: new Date(), updatedAt: new Date() } as any)
            .where(eq(products.id, id))
            .returning();
        return result.length > 0;
    }

    // Reviews
    async getReviews(productId: string): Promise<Review[]> {
        const db = this.ensureDb();
        return await db.select().from(reviews)
            .where(and(eq(reviews.productId, productId), eq(reviews.status, 'approved')))
            .orderBy(desc(reviews.createdAt));
    }

    // Get all reviews for admin (all statuses)
    async getAllReviews(): Promise<Review[]> {
        const db = this.ensureDb();
        return await db.select().from(reviews)
            .orderBy(desc(reviews.createdAt));
    }

    async getReview(id: string): Promise<Review | undefined> {
        const db = this.ensureDb();
        const result = await db.select().from(reviews).where(eq(reviews.id, id)).limit(1);
        return result[0];
    }

    async createReview(review: Partial<Review>): Promise<Review> {
        const db = this.ensureDb();
        const result = await db.insert(reviews).values({
            ...review,
            status: 'approved', // Auto-approve
        } as any).returning();

        // Update product rating
        if (review.productId) {
            await this.updateProductRating(review.productId);
        }

        return result[0];
    }

    async updateReview(id: string, updates: Partial<Review>): Promise<Review | undefined> {
        const db = this.ensureDb();
        const result = await db.update(reviews)
            .set({ ...updates, updatedAt: new Date() } as any)
            .where(eq(reviews.id, id))
            .returning();
        return result[0];
    }

    async deleteReview(id: string): Promise<boolean> {
        const db = this.ensureDb();
        const review = await this.getReview(id);
        const result = await db.delete(reviews).where(eq(reviews.id, id)).returning();

        // Update product rating after deletion
        if (review?.productId) {
            await this.updateProductRating(review.productId);
        }

        return result.length > 0;
    }

    async markReviewHelpful(reviewId: string, userId: string | null, ipAddress: string): Promise<boolean> {
        const db = this.ensureDb();
        // Check if already voted
        const existingVote = await db.select().from(reviewRatings)
            .where(
                and(
                    eq(reviewRatings.reviewId, reviewId),
                    userId
                        ? eq(reviewRatings.userId, userId)
                        : eq(reviewRatings.ipAddress, ipAddress)
                )
            ).limit(1);

        if (existingVote.length > 0) {
            return false; // Already voted
        }

        // Record the vote
        await db.insert(reviewRatings).values({
            reviewId,
            userId,
            ipAddress,
            isHelpful: true,
        });

        // Increment helpful count
        await db.update(reviews)
            .set({ helpfulCount: sql`COALESCE(${reviews.helpfulCount}, 0) + 1` } as any)
            .where(eq(reviews.id, reviewId));

        return true;
    }

    async updateProductRating(productId: string): Promise<void> {
        const db = this.ensureDb();
        // Calculate average rating from approved reviews
        const result = await db.execute(sql`
      SELECT 
        COALESCE(AVG(rating), 0) as avg_rating,
        COUNT(*) as review_count 
      FROM reviews 
      WHERE product_id = ${productId} AND status = 'approved'
    `);

        const avgRating = Number(result.rows[0]?.avg_rating || 0).toFixed(1);
        const reviewCount = Number(result.rows[0]?.review_count || 0);

        await db.update(products)
            .set({
                rating: avgRating,
                reviewCount: reviewCount,
                updatedAt: new Date()
            } as any)
            .where(eq(products.id, productId));
    }

    // Discounts
    async getDiscounts(productId?: string): Promise<Discount[]> {
        const db = this.ensureDb();
        if (productId) {
            return await db.select().from(discounts).where(eq(discounts.productId, productId)).orderBy(desc(discounts.createdAt));
        }
        return await db.select().from(discounts).orderBy(desc(discounts.createdAt));
    }

    async getDiscount(id: string): Promise<Discount | undefined> {
        const db = this.ensureDb();
        const result = await db.select().from(discounts).where(eq(discounts.id, id)).limit(1);
        return result[0];
    }

    async createDiscount(discount: Partial<Discount>): Promise<Discount> {
        const db = this.ensureDb();
        const result = await db.insert(discounts).values(discount as any).returning();
        return result[0];
    }

    async updateDiscount(id: string, updates: Partial<Discount>): Promise<Discount | undefined> {
        const db = this.ensureDb();
        const result = await db.update(discounts).set({ ...updates, updatedAt: new Date() } as any).where(eq(discounts.id, id)).returning();
        return result[0];
    }

    async deleteDiscount(id: string): Promise<boolean> {
        const db = this.ensureDb();
        const result = await db.delete(discounts).where(eq(discounts.id, id)).returning();
        return result.length > 0;
    }

    // Fish Species methods implementation
    async getAllFishSpecies(): Promise<FishSpecies[]> {
        const db = this.ensureDb();
        return await db.select().from(fishSpecies);
    }

    async getFishSpeciesById(id: string): Promise<FishSpecies | undefined> {
        const db = this.ensureDb();
        const result = await db.select().from(fishSpecies).where(eq(fishSpecies.id, id));
        return result[0];
    }

    async seedFishSpeciesIfNeeded(): Promise<void> {
        // Implementation can be moved here or kept in seed script
    }
    // Helper to get top selling product IDs from real order data
    private async getHighSalesProductIds(limit: number = 20): Promise<string[]> {
        const db = this.ensureDb();
        try {
            // Aggregate sales quantity per product
            const sales = await db.select({
                productId: orderItems.productId,
                totalSold: sql<number>`sum(${orderItems.quantity})`
            })
                .from(orderItems)
                .leftJoin(orders, eq(orders.id, orderItems.orderId))
                .where(
                    eq(orders.status, 'completed') // Only completed orders
                )
                .groupBy(orderItems.productId)
                .orderBy(desc(sql`sum(${orderItems.quantity})`))
                .limit(limit);

            return sales.map(s => s.productId);
        } catch (err) {
            console.error("Error fetching high sales products:", err);
            return [];
        }
    }

    async getTopSellingProducts(): Promise<{ productOfWeek: Product | null; bestSellers: Product[] }> {
        const db = this.ensureDb();
        try {
            // 1. Get Top Sales IDs (Smart/Automatic)
            const topSalesIds = await this.getHighSalesProductIds(10);

            // 2. Logic:
            // - Manual flag is heavily weighted
            // - Real Sales Data is weighted (Smart)
            // - High Rating is fallback

            // Base condition for Best Seller
            const bestSellerCondition = or(
                eq(products.isBestSeller, true),
                topSalesIds.length > 0 ? inArray(products.id, topSalesIds) : undefined,
                and(gt(products.rating, '4.0'), gt(products.reviewCount, 0))
            );

            let bestSellers = await db.select().from(products)
                .where(and(bestSellerCondition, isNull(products.deletedAt)))
                .orderBy(desc(products.isBestSeller), desc(products.rating))
                .limit(12);

            // Fallback if still empty (just get newest)
            if (bestSellers.length === 0) {
                bestSellers = await db.select().from(products)
                    .where(isNull(products.deletedAt))
                    .orderBy(desc(products.createdAt))
                    .limit(10);
            }

            // Get product of the week: Prefer explicitly marked product
            const explicitProductOfWeek = await db.select().from(products)
                .where(and(eq(products.isProductOfWeek, true), isNull(products.deletedAt)))
                .limit(1);

            let productOfWeek = explicitProductOfWeek.length > 0 ? explicitProductOfWeek[0] : null;

            // Fallback: Pick item with max reviews/rating from best sellers
            if (!productOfWeek && bestSellers.length > 0) {
                const sorted = [...bestSellers].sort((a, b) => Number(b.reviewCount) - Number(a.reviewCount));
                productOfWeek = sorted[0];
            }

            return {
                productOfWeek,
                bestSellers: bestSellers.slice(0, 10)
            };
        } catch (error) {
            console.error("Error fetching top selling products:", error);
            return { productOfWeek: null, bestSellers: [] };
        }
    }
}
