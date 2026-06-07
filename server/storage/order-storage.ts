import { randomBytes } from "node:crypto";
import { type Order, type Coupon, type AuditLog, type CartItem, type Favorite, type GallerySubmission, type GalleryPrize, type Payment, type ProductVariant, type OrderLineItem, orders, coupons, auditLogs, cartItems, favorites, gallerySubmissions, galleryVotes, galleryPrizes, payments, products, settings, orderItems, returnRequests, referrals, loyaltyTransactions, loyaltyCoupons, autoOrders } from "../../shared/schema.js";
import { eq, desc, and, sql, or, isNull } from "drizzle-orm";
import { getDb } from "../db.js";
import { loyaltyStorage, type TransactionalOrderLoyaltyResult } from "./loyalty-storage.js";

const ORDER_NUMBER_MAX_ATTEMPTS = 3;

interface CreateOrderLineInput {
    productId: string;
    quantity: number;
    variantId?: string;
}

interface CreateOrderLoyaltyOptions {
    useCashback?: boolean;
    cashbackToUse?: number;
}

type OrderWithLoyalty = Order & {
    loyaltyResult?: TransactionalOrderLoyaltyResult;
    actualCashbackUsed?: number;
};

interface LockedProductRow {
    id: string;
    name: string;
    price: string | number;
    stock: number | null;
    variants: ProductVariant[] | null;
    hasVariants?: boolean;
}

export class OrderStorage {
    private db = getDb();

    private ensureDb() {
        if (!this.db) {
            throw new Error('Database not connected. Please configure DATABASE_URL in your .env file.');
        }
        return this.db;
    }

    private async lockProductForUpdate(tx: any, productId: string): Promise<LockedProductRow | undefined> {
        const result = await tx.execute(sql`
            SELECT id, name, price, stock, variants, has_variants AS "hasVariants"
            FROM products
            WHERE id = ${productId}
            FOR UPDATE
        `);
        const rows = Array.isArray(result) ? result : (result?.rows ?? []);
        return rows[0] as LockedProductRow | undefined;
    }

    private parsePositivePrice(value: unknown, label: string): number {
        const price = Number(value);
        if (!Number.isFinite(price) || price <= 0) {
            throw new Error(`${label} is not available for purchase`);
        }
        return price;
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
        // Try by UUID first, then by orderNumber (for public tracking)
        const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
        if (result[0]) return result[0];
        const byNumber = await db.select().from(orders).where(eq(orders.orderNumber, id)).limit(1);
        return byNumber[0];
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

    async deleteOrder(id: string): Promise<boolean> {
        const db = this.ensureDb();
        // Clear nullable FK references first
        await db.update(referrals).set({ firstOrderId: null } as any).where(eq(referrals.firstOrderId as any, id));
        await db.update(autoOrders).set({ lastOrderId: null } as any).where(eq(autoOrders.lastOrderId as any, id));
        await db.update(loyaltyTransactions).set({ orderId: null } as any).where(eq(loyaltyTransactions.orderId as any, id));
        await db.update(loyaltyCoupons).set({ usedOrderId: null } as any).where(eq(loyaltyCoupons.usedOrderId as any, id));
        // Delete child rows with NOT NULL FK
        await db.delete(returnRequests).where(eq(returnRequests.orderId, id));
        await db.delete(orderItems).where(eq(orderItems.orderId, id));
        await db.delete(payments).where(eq(payments.orderId, id));
        // Now delete the order itself
        const result = await db.delete(orders).where(eq(orders.id, id)).returning({ id: orders.id });
        return result.length > 0;
    }

    /**
     * Generate a public order number without using daily counts as a uniqueness source.
     * Format: FH-YYMMDD-XXXXXXXX where suffix is cryptographically random uppercase hex.
     */
    private generateOrderNumber(): string {
        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const datePrefix = `FH-${year}${month}${day}`;
        const randomSuffix = randomBytes(4).toString("hex").toUpperCase();

        return `${datePrefix}-${randomSuffix}`;
    }

    private isOrderNumberUniqueViolation(error: unknown): boolean {
        const candidates = [error, (error as { cause?: unknown })?.cause];

        return candidates.some((candidate) => {
            const dbError = candidate as {
                code?: unknown;
                constraint?: unknown;
                detail?: unknown;
                message?: unknown;
            } | undefined;

            if (dbError?.code !== "23505") {
                return false;
            }

            const text = [dbError.constraint, dbError.detail, dbError.message]
                .filter((value): value is string => typeof value === "string")
                .join(" ")
                .toLowerCase();

            return text.includes("order_number") || text.includes("orders_order_number_unique");
        });
    }

    async createOrderSecure(
        userId: string | null,
        items: CreateOrderLineInput[],
        customerInfo: any,
        couponCode?: string,
        loyaltyOptions: CreateOrderLoyaltyOptions = {},
    ): Promise<OrderWithLoyalty> {
        const db = this.ensureDb();
        if (!userId && loyaltyOptions.useCashback && Number(loyaltyOptions.cashbackToUse ?? 0) > 0) {
            throw new Error("Cashback redemption requires an authenticated customer");
        }

        for (let attempt = 1; attempt <= ORDER_NUMBER_MAX_ATTEMPTS; attempt++) {
            try {
                return await db.transaction(async (tx) => {
            // 1. Calculate totals and validate stock
            let subtotal = 0;
            const orderItemsData: OrderLineItem[] = [];

            // Lock each product row before price/stock validation so concurrent orders cannot oversell.
            for (const item of items) {
                const product = await this.lockProductForUpdate(tx, item.productId);
                if (!product) throw new Error(`Product ${item.productId} not found`);

                const quantity = Number(item.quantity);
                if (!Number.isInteger(quantity) || quantity <= 0) {
                    throw new Error(`Invalid quantity for ${product.name}`);
                }

                let price: number;
                let variantLabel: string | undefined;

                if (item.variantId) {
                    const variants = Array.isArray(product.variants) ? product.variants : [];
                    const selectedVariant = variants.find((variant) => variant.id === item.variantId);
                    if (!selectedVariant) {
                        throw new Error(`Invalid variant ${item.variantId} for ${product.name}`);
                    }

                    const variantStock = Number(selectedVariant.stock ?? 0);
                    if (variantStock < quantity) {
                        throw new Error(`Insufficient stock for ${product.name} (${selectedVariant.label})`);
                    }

                    price = this.parsePositivePrice(selectedVariant.price, `Variant ${selectedVariant.label}`);
                    variantLabel = selectedVariant.label;

                    const updatedVariants = variants.map((variant) =>
                        variant.id === selectedVariant.id
                            ? { ...variant, stock: variantStock - quantity }
                            : variant
                    );
                    const currentBaseStock = Number(product.stock ?? 0);
                    const nextBaseStock = currentBaseStock > 0
                        ? Math.max(0, currentBaseStock - quantity)
                        : currentBaseStock;

                    await tx.update(products)
                        .set({
                            variants: updatedVariants,
                            stock: nextBaseStock,
                            updatedAt: new Date(),
                        } as any)
                        .where(eq(products.id, product.id));
                } else {
                    const currentStock = Number(product.stock ?? 0);
                    if (currentStock < quantity) {
                        throw new Error(`Insufficient stock for ${product.name}`);
                    }

                    price = this.parsePositivePrice(product.price, `Product ${product.name}`);

                    await tx.update(products)
                        .set({
                            stock: currentStock - quantity,
                            updatedAt: new Date(),
                        } as any)
                        .where(eq(products.id, product.id));
                }

                const lineTotal = price * quantity;
                subtotal += lineTotal;

                orderItemsData.push({
                    productId: product.id,
                    productName: product.name,
                    quantity,
                    ...(item.variantId ? { variantId: item.variantId } : {}),
                    ...(variantLabel ? { variantLabel } : {}),
                    priceAtPurchase: price,
                    lineTotal,
                });
            }

            // 2. Calculate Delivery Fee — reads from settings DB (fallback 5000)
            const shippingRow = await tx.select().from(settings).where(eq(settings.key, "shipping_fee")).limit(1);
            const configuredFee = Number(shippingRow[0]?.value ?? 5000);
            let deliveryFee = subtotal >= 100000 ? 0 : configuredFee;

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

                    const isNotExhausted = !coupon.maxUses || (coupon.usedCount || 0) < coupon.maxUses;

                    if (isValidDate && isValidAmount && isNotExhausted) {
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
            const IRAQI_DENOMINATION = 250;
            const roundedTotal = Math.ceil(finalTotal / IRAQI_DENOMINATION) * IRAQI_DENOMINATION;
            const roundingCashback = roundedTotal - finalTotal;

            // 5. Generate Order Number. DB unique constraint remains the final authority.
            const orderNumber = this.generateOrderNumber();

            // 6. Create Order — store enriched items with product names and prices
            const [newOrder] = await tx.insert(orders).values({
                orderNumber: orderNumber,
                userId: userId ? userId : undefined,
                items: orderItemsData,
                total: finalTotal.toString(),
                roundedTotal: roundedTotal.toString(),
                roundingCashback: roundingCashback,
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

            if (userId) {
                const loyaltyResult = await loyaltyStorage.processOrderPointsInTransaction(tx, {
                    userId,
                    orderId: newOrder.id,
                    orderTotal: finalTotal,
                    useCashback: loyaltyOptions.useCashback,
                    cashbackToUse: loyaltyOptions.cashbackToUse,
                });

                Object.assign(newOrder, {
                    roundedTotal: String(loyaltyResult.roundedTotal),
                    pointsUsed: 0,
                    cashbackUsed: loyaltyResult.actualCashbackUsed,
                    pointsDiscount: String(loyaltyResult.pointsDiscount),
                    pointsEarned: loyaltyResult.purchasePoints,
                    roundingCashback: loyaltyResult.roundingPoints,
                });
                Object.defineProperties(newOrder, {
                    loyaltyResult: { value: loyaltyResult, enumerable: false },
                    actualCashbackUsed: { value: loyaltyResult.actualCashbackUsed, enumerable: false },
                });
            }

            return newOrder as OrderWithLoyalty;
                });
            } catch (error) {
                if (this.isOrderNumberUniqueViolation(error)) {
                    if (attempt < ORDER_NUMBER_MAX_ATTEMPTS) {
                        continue;
                    }
                    throw new Error("Order creation failed after repeated order number collisions. Please try again.");
                }

                throw error;
            }
        }

        throw new Error("Order creation failed after repeated order number collisions. Please try again.");
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

    async getCouponsByUserId(_userId: string): Promise<Coupon[]> {
        const db = this.ensureDb();
        // Return active public coupons that haven't exceeded their usage limit
        return await db.select().from(coupons)
            .where(and(
                eq(coupons.isActive, true),
                or(isNull(coupons.maxUses), sql`${coupons.usedCount} < ${coupons.maxUses}`)
            ));
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

        return items.map(({ cartItem, product }) => ({
            ...cartItem,
            product: {
                ...product,
                // Use variant price if stored, otherwise fallback to product DB price
                price: (cartItem as any).variantPrice ?? product.price,
                name: (cartItem as any).variantLabel
                    ? `${product.name} (${(cartItem as any).variantLabel})`
                    : product.name,
            }
        }));
    }

    async addToCart(
        userId: string,
        productId: string,
        quantity: number,
        variantPrice?: number,
        variantLabel?: string,
        variantId?: string
    ): Promise<CartItem> {
        if (quantity <= 0) throw new Error("Quantity must be positive");

        const db = this.ensureDb();

        const [product] = await db.select().from(products)
            .where(or(eq(products.id, productId), eq(products.slug, productId)));
        if (!product) throw new Error("Product not found");

        // For variant products, use variant stock if variantId provided
        const effectiveStock = product.stock || 0;
        if (effectiveStock < quantity) throw new Error("وصلت للكمية المتوفرة حالياً من هذا المنتج");

        const actualProductId = product.id;

        const [existing] = await db.select().from(cartItems)
            .where(and(
                eq(cartItems.userId, userId), 
                eq(cartItems.productId, actualProductId),
                variantId ? eq(cartItems.variantId, variantId) : isNull(cartItems.variantId)
            ));

        if (existing) {
            if (effectiveStock < (existing.quantity || 0) + quantity) {
                throw new Error("وصلت للكمية المتوفرة حالياً من هذا المنتج");
            }

            const [updated] = await db.update(cartItems)
                .set({
                    quantity: (existing.quantity || 0) + quantity,
                    // Update variant info if provided (user may change variant)
                    ...(variantPrice !== undefined && { variantPrice: variantPrice.toString() }),
                    ...(variantLabel !== undefined && { variantLabel }),
                    ...(variantId !== undefined && { variantId }),
                } as any)
                .where(eq(cartItems.id, existing.id))
                .returning();
            return updated;
        } else {
            const [created] = await db.insert(cartItems)
                .values({
                    userId,
                    productId: actualProductId,
                    quantity,
                    // Store variant info for correct pricing
                    ...(variantPrice !== undefined && { variantPrice: variantPrice.toString() }),
                    ...(variantLabel !== undefined && { variantLabel }),
                    ...(variantId !== undefined && { variantId }),
                } as any)
                .returning();
            return created;
        }
    }

    async updateCartItem(userId: string, itemId: string, quantity: number): Promise<CartItem> {
        const db = this.ensureDb();
        const [updated] = await db.update(cartItems)
            .set({ quantity })
            .where(and(eq(cartItems.userId, userId), eq(cartItems.id, itemId)))
            .returning();
        return updated;
    }

    async removeFromCart(userId: string, itemId: string): Promise<void> {
        const db = this.ensureDb();
        await db.delete(cartItems)
            .where(and(eq(cartItems.userId, userId), eq(cartItems.id, itemId)));
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
        const [product] = await db.select().from(products)
            .where(or(eq(products.id, productId), eq(products.slug, productId)));
        if (!product) throw new Error("Product not found");

        const [existing] = await db.select().from(favorites)
            .where(and(eq(favorites.userId, userId), eq(favorites.productId, product.id)));

        if (existing) return existing;

        const [created] = await db.insert(favorites)
            .values({ userId, productId: product.id })
            .returning();
        return created;
    }

    async removeFavorite(userId: string, productId: string): Promise<void> {
        const db = this.ensureDb();
        const [product] = await db.select().from(products)
            .where(or(eq(products.id, productId), eq(products.slug, productId)));
        if (!product) return;

        await db.delete(favorites)
            .where(and(eq(favorites.userId, userId), eq(favorites.productId, product.id)));
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
    async getTopSellingProducts(): Promise<{ productOfWeek: any | null; bestSellers: any[]; hasRealSales: boolean }> {
        return { productOfWeek: null, bestSellers: [], hasRealSales: false };
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
