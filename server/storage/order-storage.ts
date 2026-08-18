import { randomBytes } from "node:crypto";
import { type Order, type Coupon, type AuditLog, type CartItem, type Favorite, type GallerySubmission, type GalleryPrize, type Payment, type ProductVariant, type OrderLineItem, orders, coupons, auditLogs, cartItems, favorites, gallerySubmissions, galleryVotes, galleryPrizes, payments, products, settings, orderItems, returnRequests, referrals, loyaltyTransactions, loyaltyCoupons, autoOrders } from "../../shared/schema.js";
import { eq, desc, and, sql, or, isNull } from "drizzle-orm";
import { getDb } from "../db.js";
import { toPublicProduct } from "../../shared/public-product.js";
import { loyaltyStorage, type TransactionalOrderLoyaltyResult } from "./loyalty-storage.js";
import {
    buildProductCostSnapshot,
    lockProductRowForUpdate,
    toJsonbCostFields,
    toRelationalCostFields,
    type LockedProductRow as CanonicalLockedProductRow,
} from "../services/product-cost-snapshot.js";

const ORDER_NUMBER_MAX_ATTEMPTS = 3;

// Canonical Arabic stock errors — shared so routes can map them to HTTP 409
// and the frontend can surface a clean message without leaking English.
export const STOCK_ERROR_INSUFFICIENT = "الكمية المطلوبة غير متوفرة حالياً";
export const STOCK_ERROR_MAX_REACHED = "وصلت للكمية المتوفرة";
export function isStockError(message?: string): boolean {
    if (!message) return false;
    return message.includes(STOCK_ERROR_INSUFFICIENT) || message.includes(STOCK_ERROR_MAX_REACHED);
}

/**
 * The production database enforces a second, DB-level inventory backstop
 * (`settings.inventory_ledger_mode='enforce'`): inserting an order line into
 * `order_items_relational` records a `sale` movement in `inventory_movements`,
 * and the `prevent_negative_inventory_balance` BEFORE-INSERT trigger RAISEs
 *   `insufficient canonical inventory balance for product %, variant %, location %`
 * whenever the canonical running balance (SUM of movement deltas) would go
 * negative. That is a genuine out-of-stock/availability outcome discovered at
 * commit time — NOT a server fault — so it must surface as a clean domain
 * availability conflict (HTTP 409), never as an opaque HTTP 500 with a raw
 * English Postgres message leaking to the customer.
 *
 * See docs/audit/inventory-availability-remediation.md (F-6).
 */
export function isCanonicalInventoryBalanceError(error: unknown): boolean {
    if (!error) return false;
    const anyErr = error as { message?: unknown; cause?: unknown };
    const direct = typeof anyErr.message === "string" &&
        anyErr.message.includes("insufficient canonical inventory balance");
    if (direct) return true;
    // Postgres driver errors sometimes wrap the DB message in `cause`.
    return isCanonicalInventoryBalanceError(anyErr.cause);
}

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

type LockedProductRow = CanonicalLockedProductRow & {
    variants: ProductVariant[] | null;
};

export class OrderStorage {
    private db = getDb();

    private ensureDb() {
        if (!this.db) {
            throw new Error('Database not connected. Please configure DATABASE_URL in your .env file.');
        }
        return this.db;
    }

    /**
     * Lock the product row for the duration of the creation transaction.
     *
     * F-1 FIX: this used to SELECT only id/name/price/stock/variants/has_variants,
     * so every cost field read back `undefined` and EVERY storefront line was
     * frozen as `costStatus:"unknown"` — permanently uncostable. It now delegates
     * to the canonical `lockProductRowForUpdate`, which is the single SELECT
     * shared by all creation paths and always carries the cost columns.
     */
    private async lockProductForUpdate(tx: any, productId: string): Promise<LockedProductRow | undefined> {
        return await lockProductRowForUpdate(tx, productId) as LockedProductRow | undefined;
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

        // SECURITY: only return orders explicitly linked to this account (user_id).
        // We intentionally do NOT match guest orders by phone here — phone numbers
        // are user-editable and unverified, so phone matching would be an IDOR/PII
        // leak. Linking a guest order to an account requires a verified claim flow.
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

    /**
     * @deprecated UNSAFE — DISABLED. Use {@link createOrderSecure} instead.
     *
     * This wrote `orders` with a bare non-transactional insert and never wrote
     * `order_items_relational`. That is precisely the defect that left 12
     * production orders (73 lines) with no relational rows between 2026-05-12 and
     * 2026-06-17, fixed for the storefront by f1b85d4 — but this function kept the
     * old shape and would silently reintroduce the gap for any new caller.
     *
     * It now fails closed rather than corrupting data. Deliberately NOT deleted:
     * it stays on the storage interface so existing type contracts still compile
     * and the history remains visible.
     */
    async createOrder(_order: Partial<Order>): Promise<Order> {
        throw new Error(
            "storage.createOrder() is disabled: it wrote no order_items_relational rows " +
            "and used no transaction, which caused the 2026-05/06 relational coverage gap. " +
            "Use storage.createOrderSecure() — it writes orders.items and " +
            "order_items_relational inside one transaction."
        );
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
        // NOTE: order line items are stored inline in orders.items (JSONB); the
        // normalized `order_items` table is not provisioned in this DB. Guard the
        // delete so a missing table can never block order deletion.
        try {
            await db.delete(orderItems).where(eq(orderItems.orderId, id));
        } catch (err) {
            console.warn("[AQUAVO] Skipping order_items cleanup (table not present):", (err as Error)?.message);
        }
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
        idempotencyKey?: string,
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
            // One timestamp for the whole order so JSONB and relational snapshots agree.
            const snapshotAt = new Date();
            const lineSnapshots: ReturnType<typeof buildProductCostSnapshot>[] = [];

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
                        throw new Error(`${STOCK_ERROR_INSUFFICIENT} (${product.name} — ${selectedVariant.label})`);
                    }

                    price = this.parsePositivePrice(selectedVariant.price, `Variant ${selectedVariant.label}`);
                    variantLabel = selectedVariant.label;
                } else {
                    const currentStock = Number(product.stock ?? 0);
                    if (currentStock < quantity) {
                        throw new Error(`${STOCK_ERROR_INSUFFICIENT} (${product.name})`);
                    }

                    price = this.parsePositivePrice(product.price, `Product ${product.name}`);
                }

                // Stock is canonical-ledger owned. Do NOT mutate products.stock or
                // variant stock here: inserting order_items_relational below fires
                // record_order_item_inventory_sale(), which writes the immutable sale
                // movement; the inventory projection trigger then updates storefront
                // stock. A direct write is intentionally rejected in enforce mode.
                const lineTotal = price * quantity;
                subtotal += lineTotal;

                // Immutable cost snapshot — freeze the product's current cost onto the
                // order line so later cost edits can't rewrite this order's profit.
                // Built by the ONE canonical builder shared with the admin/WhatsApp
                // path. Verified 0 stays 0; UNKNOWN stays NULL. Never conflated.
                const snapshot = buildProductCostSnapshot(product, snapshotAt);
                lineSnapshots.push(snapshot);

                orderItemsData.push({
                    productId: product.id,
                    productName: product.name,
                    quantity,
                    ...(item.variantId ? { variantId: item.variantId } : {}),
                    ...(variantLabel ? { variantLabel } : {}),
                    priceAtPurchase: price,
                    lineTotal,
                    ...toJsonbCostFields(snapshot),
                });
            }

            // 2. Calculate Delivery Fee — reads from settings DB (fallback 5000)
            const shippingRow = await tx.select().from(settings).where(eq(settings.key, "shipping_fee")).limit(1);
            const configuredFee = Number(shippingRow[0]?.value ?? 5000);
            let deliveryFee = Number.isFinite(configuredFee) && configuredFee > 0 ? configuredFee : 5000;

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
                ...(idempotencyKey ? { id: idempotencyKey } : {}),
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

            // 6b. Persist normalized line items into order_items_relational so that
            // sales analytics (top-selling, predictive, inventory) see website orders.
            // Items are also kept inline in orders.items (JSONB) for fast reads.
            if (orderItemsData.length > 0) {
                await tx.insert(orderItems).values(
                    orderItemsData.map((line, idx) => ({
                        orderId: newOrder.id,
                        productId: line.productId,
                        quantity: line.quantity,
                        priceAtPurchase: String(line.priceAtPurchase),
                        totalPrice: String(line.lineTotal),
                        // Same canonical snapshot object that produced the JSONB line,
                        // so both stores are guaranteed to agree. NULL (not 0) = unknown.
                        ...toRelationalCostFields(lineSnapshots[idx]),
                        metadata: (line.variantId || line.variantLabel)
                            ? { variantId: line.variantId, variantLabel: line.variantLabel }
                            : null,
                    })) as any,
                );
            }

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

                // The DB-level enforce-mode canonical ledger rejected the sale
                // because the item is not actually available (canonical balance
                // would go negative). The whole transaction has already rolled
                // back — no order, no oversell. Re-surface it as the canonical
                // Arabic availability error so the route maps it to a controlled
                // 409 (never a 500 with a leaked English Postgres message).
                if (isCanonicalInventoryBalanceError(error)) {
                    throw new Error(STOCK_ERROR_INSUFFICIENT);
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

        // Sanitized for the same reason as getFavorites: GET /api/cart serves this to the customer, and
        // the join pulled every cost column along with it. The variant price/name overrides below are
        // applied on top of the PUBLIC product, so the storefront behaviour is unchanged.
        return items.map(({ cartItem, product }) => ({
            ...cartItem,
            product: {
                ...toPublicProduct(product),
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

        // Source of truth for stock: for variant products use the selected
        // variant's stock, otherwise the base product stock.
        let effectiveStock = product.stock || 0;
        if (variantId && Array.isArray((product as any).variants)) {
            const selected = ((product as any).variants as ProductVariant[]).find((v) => v.id === variantId);
            if (selected) effectiveStock = Number(selected.stock ?? 0);
        }
        if (effectiveStock < quantity) throw new Error(STOCK_ERROR_INSUFFICIENT);

        const actualProductId = product.id;

        const [existing] = await db.select().from(cartItems)
            .where(and(
                eq(cartItems.userId, userId),
                eq(cartItems.productId, actualProductId),
                variantId ? eq(cartItems.variantId, variantId) : isNull(cartItems.variantId)
            ));

        if (existing) {
            if (effectiveStock < (existing.quantity || 0) + quantity) {
                // Already holding the maximum available quantity in the cart.
                throw new Error(STOCK_ERROR_MAX_REACHED);
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

        // Validate the requested quantity against current stock before
        // writing it — variant stock when this line is a variant, base-product
        // stock otherwise. Mirrors the same source-of-truth check already done
        // in addToCart()/createOrderSecure() so a client can never bypass the
        // add-to-cart cap by requesting a bump via PUT.
        const [existing] = await db.select().from(cartItems)
            .where(and(eq(cartItems.userId, userId), eq(cartItems.id, itemId)));

        if (existing) {
            const [product] = await db.select().from(products)
                .where(eq(products.id, existing.productId));

            if (product) {
                let effectiveStock = Number(product.stock ?? 0);
                if (existing.variantId && Array.isArray((product as any).variants)) {
                    const selected = ((product as any).variants as ProductVariant[])
                        .find((v) => v.id === existing.variantId);
                    if (selected) effectiveStock = Number(selected.stock ?? 0);
                }
                if (effectiveStock < quantity) {
                    throw new Error(STOCK_ERROR_INSUFFICIENT);
                }
            }
        }

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

        // `product: products` selects the whole row, cost columns included, and this list is served
        // straight to a logged-in customer by GET /api/favorites. Authenticated, but every customer with
        // a favourite could read AQUAVO's cost basis. Same defect class as the public product list.
        return items.map(({ favorite, product }) => ({ ...favorite, product: toPublicProduct(product) })) as any;
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