import { type Order, type Coupon, type AuditLog, type CartItem, type Favorite, type GallerySubmission, type GalleryPrize, type Payment, orders, coupons, auditLogs, cartItems, favorites, gallerySubmissions, galleryVotes, galleryPrizes, payments, products } from "../../shared/schema.js";
import { eq, desc, and, sql } from "drizzle-orm";
import { getDb } from "../db.js";

export class OrderStorage {
    private db = getDb();

    private ensureDb() {
        if (!this.db) {
            throw new Error('Database not connected. Please configure DATABASE_URL in your .env file.');
        }
        return this.db;
    }

    async getOrders(userId?: string, options?: { limit?: number; offset?: number }): Promise<Order[]> {
        const db = this.ensureDb();
        let query = db.select().from(orders);

        if (userId) {
            query = query.where(eq(orders.userId, userId)) as any;
        }

        query = query.orderBy(desc(orders.createdAt)) as any;

        if (options?.limit) {
            query = query.limit(options.limit) as any;
        }
        if (options?.offset) {
            query = query.offset(options.offset) as any;
        }

        return await query;
    }

    async getOrder(id: string): Promise<Order | undefined> {
        const db = this.ensureDb();
        const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
        return result[0];
    }

    async createOrder(order: Partial<Order>): Promise<Order> {
        const db = this.ensureDb();
        const [newOrder] = await db.insert(orders).values(order as any).returning();
        return newOrder;
    }

    async updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined> {
        const db = this.ensureDb();
        const [updatedOrder] = await db.update(orders).set(updates).where(eq(orders.id, id)).returning();
        return updatedOrder;
    }

    async createOrderSecure(userId: string | null, items: any[], customerInfo: any, couponCode?: string): Promise<Order> {
        const db = this.ensureDb();
        return await db.transaction(async (tx) => {
            // 1. Calculate totals and validate stock
            let subtotal = 0;
            const orderItemsData = [];

            // Fetch products to verify stock and price (avoid client-side trust)
            for (const item of items) {
                const [product] = await tx.select().from(products).where(eq(products.id, item.productId));
                if (!product) throw new Error(`Product ${item.productId} not found`);
                if ((product.stock || 0) < item.quantity) throw new Error(`Insufficient stock for ${product.name}`);

                // Use DB price, not client price
                const price = Number(product.price);
                subtotal += price * item.quantity;

                orderItemsData.push({
                    productId: product.id,
                    quantity: item.quantity,
                    priceAtPurchase: price.toString(),
                });

                // Decrease stock
                await tx.update(products)
                    .set({ stock: (product.stock || 0) - item.quantity } as any)
                    .where(eq(products.id, product.id));
            }

            // 2. Calculate Delivery Fee (Logic must match frontend: 5000 if < 100000, else 0)
            let deliveryFee = subtotal > 100000 ? 0 : 5000;

            // 3. Apply Coupon
            let discount = 0;
            let couponId = null;

            if (couponCode) {
                const [coupon] = await tx.select().from(coupons)
                    .where(and(eq(sql`lower(${coupons.code})`, couponCode.toLowerCase()), eq(coupons.isActive, true)))
                    .limit(1);

                if (coupon) {
                    // Check logic validity again (expiry, etc) just to be safe, though UI checks it too
                    const now = new Date();
                    const isValidDate = (!coupon.startDate || new Date(coupon.startDate) <= now) &&
                        (!coupon.endDate || new Date(coupon.endDate) >= now);
                    const isValidAmount = !coupon.minOrderAmount || subtotal >= Number(coupon.minOrderAmount);

                    if (isValidDate && isValidAmount) {
                        couponId = coupon.id;
                        if (coupon.type === 'percentage') {
                            discount = Math.round((subtotal * Number(coupon.value)) / 100);
                        } else if (coupon.type === 'fixed') {
                            discount = Number(coupon.value);
                        } else if (coupon.type === 'free_shipping') {
                            deliveryFee = 0; // Override delivery fee
                            discount = 0; // No product discount
                        }

                        // Increment usage count
                        await tx.update(coupons)
                            .set({ usedCount: (coupon.usedCount || 0) + 1 } as any)
                            .where(eq(coupons.id, coupon.id));
                    }
                }
            }

            // 4. Calculate Final Total
            const finalTotal = Math.max(0, subtotal + deliveryFee - discount);

            // 5. Create Order
            const [newOrder] = await tx.insert(orders).values({
                userId: userId ? userId : undefined,
                items: items, // Legacy JSON column
                total: finalTotal.toString(),
                shippingCost: deliveryFee.toString(),
                discountTotal: discount.toString(),
                couponId: couponId,
                status: 'pending',
                paymentStatus: 'pending',
                shippingAddress: customerInfo.address,
                customerName: customerInfo.name,
                customerEmail: customerInfo.email,
                customerPhone: customerInfo.phone,
            } as any).returning();

            return newOrder;
        });
    }

    // Payment Methods
    async createPayment(payment: Partial<Payment>): Promise<Payment> {
        const db = this.ensureDb();
        const [newPayment] = await db.insert(payments).values(payment as any).returning();
        return newPayment;
    }

    // Coupon methods
    async getCoupons(): Promise<Coupon[]> {
        const db = this.ensureDb();
        return await db.select().from(coupons).orderBy(desc(coupons.createdAt));
    }

    async getCoupon(id: string): Promise<Coupon | undefined> {
        const db = this.ensureDb();
        return (await db.select().from(coupons).where(eq(coupons.id, id)).limit(1))[0];
    }

    async getCouponByCode(code: string): Promise<Coupon | undefined> {
        const db = this.ensureDb();
        return (await db.select().from(coupons).where(eq(coupons.code, code)).limit(1))[0];
    }

    async getCouponsByUserId(userId: string): Promise<Coupon[]> {
        const db = this.ensureDb();
        // Since coupons doesn't have a userId fk effectively (based on schema shown earlier, user_coupons usually linking table), 
        // assuming global access or TODO: specific implementation based on schema if customized.
        // For now returning all active coupons as "available to user" or public coupons
        return await db.select().from(coupons).where(eq(coupons.isActive, true));
    }

    async createCoupon(coupon: Partial<Coupon>): Promise<Coupon> {
        const db = this.ensureDb();

        // Sanitize timestamp fields - convert strings to Date objects
        const sanitizedCoupon = {
            ...coupon,
            startDate: coupon.startDate ? new Date(coupon.startDate as any) : undefined,
            endDate: coupon.endDate ? new Date(coupon.endDate as any) : undefined,
            // Sanitize numeric fields - convert empty strings to undefined
            value: coupon.value === '' ? undefined : coupon.value,
            minOrderAmount: coupon.minOrderAmount === '' ? undefined : coupon.minOrderAmount,
        };

        const result = await db.insert(coupons).values(sanitizedCoupon as any).returning();
        return result[0];
    }

    async updateCoupon(id: string, updates: Partial<Coupon>): Promise<Coupon | undefined> {
        const db = this.ensureDb();

        // Sanitize timestamp fields - convert strings to Date objects
        const sanitizedUpdates = {
            ...updates,
            startDate: updates.startDate ? new Date(updates.startDate as any) : undefined,
            endDate: updates.endDate ? new Date(updates.endDate as any) : undefined,
            // Sanitize numeric fields - convert empty strings to undefined
            value: updates.value === '' ? undefined : updates.value,
            minOrderAmount: updates.minOrderAmount === '' ? undefined : updates.minOrderAmount,
        };

        const result = await db.update(coupons).set(sanitizedUpdates).where(eq(coupons.id, id)).returning();
        return result[0];
    }

    async deleteCoupon(id: string): Promise<boolean> {
        const db = this.ensureDb();
        const result = await db.delete(coupons).where(eq(coupons.id, id)).returning();
        return result.length > 0;
    }

    // Audit Logs
    async createAuditLog(log: Partial<AuditLog>): Promise<AuditLog> {
        const db = this.ensureDb();
        const result = await db.insert(auditLogs).values(log as any).returning();
        return result[0];
    }

    async getAuditLogs(filters?: { userId?: string; entityType?: string; entityId?: string }): Promise<AuditLog[]> {
        const db = this.ensureDb();
        let query = db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt));

        if (filters) {
            const conditions = [];
            if (filters.userId) conditions.push(eq(auditLogs.userId, filters.userId));
            if (filters.entityType) conditions.push(eq(auditLogs.entityType, filters.entityType));
            if (filters.entityId) conditions.push(eq(auditLogs.entityId, filters.entityId));

            if (conditions.length > 0) {
                query = query.where(and(...conditions)) as any;
            }
        }
        return await query;
    }

    // Cart methods
    async getCartItems(userId: string): Promise<(CartItem & { product: any })[]> {
        const db = this.ensureDb();
        const items = await db.select({
            cartItem: cartItems,
            product: products
        })
            .from(cartItems)
            .innerJoin(products, eq(cartItems.productId, products.id))
            .where(eq(cartItems.userId, userId));

        return items.map(({ cartItem, product }) => ({ ...cartItem, product }));
    }

    async addToCart(userId: string, productId: string, quantity: number): Promise<CartItem> {
        if (quantity <= 0) throw new Error("Quantity must be positive");

        const db = this.ensureDb();

        const [product] = await db.select().from(products).where(eq(products.id, productId));
        if (!product) throw new Error("Product not found");
        if ((product.stock || 0) < quantity) throw new Error("Insufficient stock");

        const [existing] = await db.select().from(cartItems)
            .where(and(eq(cartItems.userId, userId), eq(cartItems.productId, productId)));

        if (existing) {
            // Check if adding quantity exceeds stock
            if ((product.stock || 0) < (existing.quantity || 0) + quantity) {
                throw new Error("Insufficient stock for requested total quantity");
            }

            const [updated] = await db.update(cartItems)
                .set({ quantity: (existing.quantity || 0) + quantity })
                .where(eq(cartItems.id, existing.id))
                .returning();
            return updated;
        } else {
            const [created] = await db.insert(cartItems)
                .values({ userId, productId, quantity })
                .returning();
            return created;
        }
    }

    async updateCartItem(userId: string, productId: string, quantity: number): Promise<CartItem> {
        const db = this.ensureDb();
        const [updated] = await db.update(cartItems)
            .set({ quantity })
            .where(and(eq(cartItems.userId, userId), eq(cartItems.productId, productId)))
            .returning();
        return updated;
    }

    async removeFromCart(userId: string, productId: string): Promise<void> {
        const db = this.ensureDb();
        await db.delete(cartItems)
            .where(and(eq(cartItems.userId, userId), eq(cartItems.productId, productId)));
    }

    async clearCart(userId: string): Promise<void> {
        const db = this.ensureDb();
        await db.delete(cartItems).where(eq(cartItems.userId, userId));
    }

    // Favorites methods
    async getFavorites(userId: string): Promise<(Favorite & { product: any })[]> {
        const db = this.ensureDb();
        const items = await db.select({
            favorite: favorites,
            product: products
        })
            .from(favorites)
            .innerJoin(products, eq(favorites.productId, products.id))
            .where(eq(favorites.userId, userId));

        return items.map(({ favorite, product }) => ({ ...favorite, product }));
    }

    async addFavorite(userId: string, productId: string): Promise<Favorite> {
        const db = this.ensureDb();
        const [existing] = await db.select().from(favorites)
            .where(and(eq(favorites.userId, userId), eq(favorites.productId, productId)));

        if (existing) return existing;

        const [created] = await db.insert(favorites)
            .values({ userId, productId })
            .returning();
        return created;
    }

    async removeFavorite(userId: string, productId: string): Promise<void> {
        const db = this.ensureDb();
        await db.delete(favorites)
            .where(and(eq(favorites.userId, userId), eq(favorites.productId, productId)));
    }

    // Gallery methods (Basic impl)
    async getGallerySubmissions(approvedOnly?: boolean): Promise<GallerySubmission[]> {
        const db = this.ensureDb();
        if (approvedOnly) {
            return await db.select().from(gallerySubmissions).where(eq(gallerySubmissions.isApproved, true)).orderBy(desc(gallerySubmissions.createdAt));
        }
        return await db.select().from(gallerySubmissions).orderBy(desc(gallerySubmissions.createdAt));
    }

    async createGallerySubmission(submission: Partial<GallerySubmission>): Promise<GallerySubmission> {
        const db = this.ensureDb();
        const [res] = await db.insert(gallerySubmissions).values(submission as any).returning();
        return res;
    }

    async approveGallerySubmission(id: string): Promise<GallerySubmission | undefined> {
        const db = this.ensureDb();
        const [res] = await db.update(gallerySubmissions).set({ isApproved: true } as any).where(eq(gallerySubmissions.id, id)).returning();
        return res;
    }

    async voteGallerySubmission(id: string, ipAddress: string, userId?: string): Promise<boolean> {
        const db = this.ensureDb();

        // Check if already voted using combined logic
        const conditions = [
            eq(galleryVotes.galleryId, id)
        ];

        if (userId) {
            conditions.push(sql`(${galleryVotes.ipAddress} = ${ipAddress} OR ${galleryVotes.userId} = ${userId})`);
        } else {
            conditions.push(eq(galleryVotes.ipAddress, ipAddress));
        }

        const existingVote = await db.select().from(galleryVotes)
            .where(and(...conditions))
            .limit(1);

        if (existingVote.length > 0) return false;

        // Note: neon-http driver doesn't support transactions
        // Execute operations sequentially
        await db.insert(galleryVotes).values({
            galleryId: id,
            userId: userId || null,
            ipAddress
        } as any);

        await db.update(gallerySubmissions)
            .set({ likes: sql`${gallerySubmissions.likes} + 1` } as any)
            .where(eq(gallerySubmissions.id, id));

        return true;
    }

    async deleteGallerySubmission(id: string): Promise<boolean> {
        const db = this.ensureDb();
        const res = await db.delete(gallerySubmissions).where(eq(gallerySubmissions.id, id)).returning();
        return res.length > 0;
    }

    async setGalleryWinner(id: string, month: string, prize: string, couponCode: string): Promise<void> {
        const db = this.ensureDb();

        // CRITICAL: First, clear isWinner from ALL previous winners
        // This ensures only ONE winner exists at a time in the gallery
        await db.update(gallerySubmissions).set({
            isWinner: false
        } as any).where(eq(gallerySubmissions.isWinner, true));

        // Now set the new winner
        await db.update(gallerySubmissions).set({
            isWinner: true,
            winnerMonth: month,
            prize: prize,
            couponCode: couponCode,
            hasSeenCelebration: false // Reset so they see the animation
        } as any).where(eq(gallerySubmissions.id, id));
    }

    async markCelebrationSeen(id: string): Promise<void> {
        const db = this.ensureDb();
        await db.update(gallerySubmissions).set({ hasSeenCelebration: true } as any).where(eq(gallerySubmissions.id, id));
    }

    // Gallery Prize methods
    async getCurrentGalleryPrize(): Promise<GalleryPrize | null> {
        const db = this.ensureDb();
        const now = new Date();
        const monthStr = now.toISOString().slice(0, 7); // YYYY-MM
        const [prize] = await db.select().from(galleryPrizes)
            .where(and(eq(galleryPrizes.isActive, true), eq(galleryPrizes.month, monthStr)))
            .limit(1);
        return prize || null;
    }

    async createOrUpdateGalleryPrize(prize: Partial<GalleryPrize>): Promise<GalleryPrize> {
        const db = this.ensureDb();

        // Auto-generate month if not provided (use current month)
        const month = prize.month || new Date().toISOString().slice(0, 7); // YYYY-MM

        // Set defaults
        const prizeData = {
            ...prize,
            month,
            isActive: prize.isActive !== undefined ? prize.isActive : true
        };

        const [existing] = await db.select().from(galleryPrizes).where(eq(galleryPrizes.month, month));

        if (existing) {
            const [updated] = await db.update(galleryPrizes)
                .set({ ...prizeData, updatedAt: new Date() } as any)
                .where(eq(galleryPrizes.id, existing.id))
                .returning();
            return updated;
        } else {
            const [created] = await db.insert(galleryPrizes)
                .values(prizeData as any)
                .returning();
            return created;
        }
    }

    async getGalleryPrizeByMonth(month: string): Promise<GalleryPrize | null> {
        const db = this.ensureDb();
        const [prize] = await db.select().from(galleryPrizes).where(eq(galleryPrizes.month, month));
        return prize || null;
    }


    // Sales analytics
    async getTopSellingProducts(): Promise<{ productOfWeek: any | null; bestSellers: any[] }> {
        return { productOfWeek: null, bestSellers: [] };
    }

    async seedGalleryIfNeeded(): Promise<void> {
        const db = this.ensureDb();
        const count = await db.select({ count: sql<number>`count(*)` }).from(gallerySubmissions);

        if (Number(count[0].count) > 0) return;

        console.log("Seeding gallery submissions...");

        const seedItems = [
            {
                customerName: "الطراز الهولندي",
                imageUrl: "/aquarium-styles/dutch-style.png",
                tankSize: "Dutch Style",
                description: "حديقة مائية كثيفة بالنباتات. أقدم فنون تنسيق الأحواض، يركز على تنوع النباتات والتباين في الألوان والارتفاعات. يشبه حديقة الزهور ولكن تحت الماء.",
                likes: 124,
                isApproved: true,
                createdAt: new Date()
            },
            {
                customerName: "طراز الطبيعة",
                imageUrl: "/aquarium-styles/nature-style.png",
                tankSize: "Nature Style",
                description: "تقليد المناظر الطبيعية البرية. ابتكره تاكاشي أمانو، يحاكي الغابات والوديان الطبيعية تحت الماء. يهدف إلى خلق شعور بالتدفق والطبيعية.",
                likes: 156,
                isApproved: true,
                createdAt: new Date()
            },
            {
                customerName: "الإيواغومي",
                imageUrl: "/aquarium-styles/iwagumi-style.png",
                tankSize: "Iwagumi",
                description: "بساطة يابانية وتأمل. أسلوب ياباني يعتمد على ترتيب الصخور (بعدد فردي عادة) ونباتات السجاد، بتصميم بسيط يدعو للتأمل والهدوء.",
                likes: 98,
                isApproved: true,
                createdAt: new Date()
            },
            {
                customerName: "البيوتوب",
                imageUrl: "/aquarium-styles/biotope-style.png",
                tankSize: "Biotope",
                description: "بيئة طبيعية أصلية. يعيد إنشاء موطن طبيعي محدد بدقة، مثل نهر الأمازون أو بحيرة أفريقية، مع استخدام نفس الصخور والنباتات والأسماك الموجودة في تلك المنطقة.",
                likes: 87,
                isApproved: true,
                createdAt: new Date()
            },
            {
                customerName: "طراز الغابة",
                imageUrl: "/aquarium-styles/jungle-style.png",
                tankSize: "Jungle Style",
                description: "غابة استوائية كثيفة. يحاكي المظهر الكثيف للغابة الاستوائية بنباتات متشابكة ومظهر بري جميل. يتميز بالجرأة والعشوائية المنظمة.",
                likes: 142,
                isApproved: true,
                createdAt: new Date()
            },
        ];

        for (const item of seedItems) {
            await db.insert(gallerySubmissions).values(item as any);
        }
        console.log("Gallery seeded successfully.");
    }
}
