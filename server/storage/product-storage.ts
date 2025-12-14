import { type Product, type Review, type ReviewRating, type Discount, type FishSpecies, products, reviews, reviewRatings, discounts, fishSpecies, categories } from "../../shared/schema.js";
import { eq, desc, and, gte, lte, sql, isNull, notInArray, gt } from "drizzle-orm";
import { getDb } from "../db.js";
import { randomUUID } from "crypto";

export interface ProductFilters {
    category?: string;
    subcategory?: string;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    isNew?: boolean;
    isBestSeller?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'rating' | 'price' | 'createdAt' | 'reviewCount';
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
        if (filters?.category) conditions.push(sql`lower(${products.category}) = lower(${filters.category})`);
        if (filters?.subcategory) conditions.push(sql`lower(${products.subcategory}) = lower(${filters.subcategory})`);
        if (filters?.brand) conditions.push(sql`lower(${products.brand}) = lower(${filters.brand})`);

        if (filters?.isNew !== undefined) conditions.push(eq(products.isNew, filters.isNew));
        if (filters?.isBestSeller !== undefined) conditions.push(eq(products.isBestSeller, filters.isBestSeller));
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

    async getProductAttributes(): Promise<{ categories: string[], brands: string[] }> {
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

        return {
            categories: categoryResults.map(c => c.name).filter(Boolean),
            brands: brandResults.map(b => b.brand).filter(Boolean)
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

        const result = await db.update(products).set({ ...sanitizedUpdates, updatedAt: new Date() }).where(eq(products.id, id)).returning();
        return result[0];
    }

    async deleteProduct(id: string): Promise<boolean> {
        const db = this.ensureDb();
        // Soft delete
        const result = await db.update(products)
            .set({ deletedAt: new Date(), updatedAt: new Date() })
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
            .set({ ...updates, updatedAt: new Date() })
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
            .set({ helpfulCount: sql`COALESCE(${reviews.helpfulCount}, 0) + 1` })
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
            })
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
        const result = await db.update(discounts).set({ ...updates, updatedAt: new Date() }).where(eq(discounts.id, id)).returning();
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
    async getTopSellingProducts(): Promise<{ productOfWeek: Product | null; bestSellers: Product[] }> {
        const db = this.ensureDb();
        try {
            // Logic:
            // 1. Get manually flagged best sellers first
            // 2. Sort them by Rating (High to Low) so the "Best" are truly on top
            // 3. If less than 10, fill with highest rated products from DB

            let bestSellers = await db.select().from(products)
                .where(and(eq(products.isBestSeller, true), isNull(products.deletedAt)))
                .orderBy(desc(products.rating), desc(products.reviewCount))
                .limit(10);

            // Auto-fill if we don't have enough manual best sellers
            if (bestSellers.length < 10) {
                const limitNeeded = 10 - bestSellers.length;
                const existingIds = bestSellers.map(p => p.id);

                // Get top rated products that are NOT already in the list
                const autoBestSellers = await db.select().from(products)
                    .where(and(
                        notInArray(products.id, existingIds.length > 0 ? existingIds : ['placeholder-uuid']),
                        isNull(products.deletedAt),
                        gt(products.rating, '0') // Only rated products
                    ))
                    .orderBy(desc(products.rating), desc(products.reviewCount))
                    .limit(limitNeeded);

                bestSellers = [...bestSellers, ...autoBestSellers];
            }

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

            // Fallback: Pick highest rated best seller if no explicit product of week
            if (!productOfWeek && bestSellers.length > 0) {
                // Sort by rating desc to pick the absolute best
                const sortedForWeek = [...bestSellers].sort((a, b) => Number(b.rating) - Number(a.rating));
                productOfWeek = sortedForWeek[0];
            }

            return {
                productOfWeek,
                bestSellers
            };
        } catch (error) {
            console.error("Error fetching top selling products:", error);
            return { productOfWeek: null, bestSellers: [] };
        }
    }
}
