import { User, InsertUser, Product, Order, Review, ReviewRating, Discount, AuditLog, Coupon, CartItem, Favorite, FishSpecies, GallerySubmission, GalleryPrize, NewsletterSubscription, Category, OrderItem, Payment, UserAddress, InsertUserAddress, JourneyPlan } from "../../shared/schema.js";
import { UserStorage } from "./user-storage.js";
import { ProductStorage, ProductFilters } from "./product-storage.js";
import { OrderStorage } from "./order-storage.js";

export interface IStorage {
    getUser(id: string): Promise<User | undefined>;
    getUserByEmail(email: string): Promise<User | undefined>;
    getUsers(): Promise<User[]>;
    createUser(user: InsertUser): Promise<User>;
    updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
    getProducts(filters?: ProductFilters): Promise<Product[]>;
    getProductAttributes(): Promise<{ categories: string[], brands: string[], minPrice: number, maxPrice: number }>;
    getProduct(id: string): Promise<Product | undefined>;
    getProductBySlug(slug: string): Promise<Product | undefined>;
    createProduct(product: Partial<Product>): Promise<Product>;
    updateProduct(id: string, updates: Partial<Product>): Promise<Product | undefined>;
    deleteProduct(id: string): Promise<boolean>;
    getOrders(userId?: string, options?: { limit?: number, offset?: number }): Promise<Order[]>;
    getOrder(id: string): Promise<Order | undefined>;
    createOrder(order: Partial<Order>): Promise<Order>;
    updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined>;
    getReviews(productId: string): Promise<Review[]>;
    getReview(id: string): Promise<Review | undefined>;
    createReview(review: Partial<Review>): Promise<Review>;
    updateReview(id: string, updates: Partial<Review>): Promise<Review | undefined>;
    deleteReview(id: string): Promise<boolean>;
    markReviewHelpful(reviewId: string, userId: string | null, ipAddress: string): Promise<boolean>;
    updateProductRating(productId: string): Promise<void>;
    getDiscounts(productId?: string): Promise<Discount[]>;
    getDiscount(id: string): Promise<Discount | undefined>;
    createDiscount(discount: Partial<Discount>): Promise<Discount>;
    updateDiscount(id: string, updates: Partial<Discount>): Promise<Discount | undefined>;
    deleteDiscount(id: string): Promise<boolean>;
    // Coupon methods
    getCoupons(): Promise<Coupon[]>;
    getCoupon(id: string): Promise<Coupon | undefined>;
    getCouponByCode(code: string): Promise<Coupon | undefined>;
    getCouponsByUserId(userId: string): Promise<Coupon[]>;
    createCoupon(coupon: Partial<Coupon>): Promise<Coupon>;
    updateCoupon(id: string, updates: Partial<Coupon>): Promise<Coupon | undefined>;
    deleteCoupon(id: string): Promise<boolean>;

    createAuditLog(log: Partial<AuditLog>): Promise<AuditLog>;
    getAuditLogs(filters?: { userId?: string; entityType?: string; entityId?: string }): Promise<AuditLog[]>;
    createOrderSecure(userId: string | null, items: any[], customerInfo: any, couponCode?: string): Promise<Order>;
    seedProductsIfNeeded(): Promise<void>;
    // Sales analytics
    getTopSellingProducts(): Promise<{ productOfWeek: Product | null; bestSellers: Product[] }>;

    // Cart methods
    getCartItems(userId: string): Promise<(CartItem & { product: Product })[]>;
    addToCart(userId: string, productId: string, quantity: number): Promise<CartItem>;
    updateCartItem(userId: string, productId: string, quantity: number): Promise<CartItem>;
    removeFromCart(userId: string, productId: string): Promise<void>;
    clearCart(userId: string): Promise<void>;

    // Favorites methods
    getFavorites(userId: string): Promise<(Favorite & { product: Product })[]>;
    getFishSpecies(): Promise<FishSpecies[]>;
    addFavorite(userId: string, productId: string): Promise<Favorite>;
    removeFavorite(userId: string, productId: string): Promise<void>;

    // Fish Species methods
    getAllFishSpecies(): Promise<FishSpecies[]>;
    getFishSpeciesById(id: string): Promise<FishSpecies | undefined>;
    seedFishSpeciesIfNeeded(): Promise<void>;

    // Gallery methods
    getGallerySubmissions(approvedOnly?: boolean): Promise<GallerySubmission[]>;
    createGallerySubmission(submission: Partial<GallerySubmission>): Promise<GallerySubmission>;
    approveGallerySubmission(id: string): Promise<GallerySubmission | undefined>;
    voteGallerySubmission(id: string, ipAddress: string, userId?: string): Promise<boolean>;
    deleteGallerySubmission(id: string): Promise<boolean>;
    setGalleryWinner(id: string, month: string, prize: string, couponCode: string): Promise<void>;
    markCelebrationSeen(id: string): Promise<void>;

    // Gallery Prize methods
    getCurrentGalleryPrize(): Promise<GalleryPrize | null>;
    createOrUpdateGalleryPrize(prize: Partial<GalleryPrize>): Promise<GalleryPrize>;
    getGalleryPrizeByMonth(month: string): Promise<GalleryPrize | null>;

    // Payment
    createPayment(payment: Partial<Payment>): Promise<Payment>;

    // User Addresses
    createUserAddress(address: InsertUserAddress): Promise<UserAddress>;
    getUserAddresses(userId: string): Promise<UserAddress[]>;

    // Recommendations
    getFrequentlyBoughtTogether(productId: string): Promise<Product[]>;
    getSimilarProducts(productId: string): Promise<Product[]>;
    getTrendingProducts(): Promise<Product[]>;

    // Password Reset
    createPasswordResetToken(userId: string, tokenHash: string, expiresAt: Date): Promise<string>;
    verifyPasswordResetToken(tokenHash: string): Promise<{ userId: string; expiresAt: Date } | undefined>;
    deletePasswordResetToken(tokenHash: string): Promise<void>;
    processPasswordReset(tokenHash: string, newPasswordHash: string): Promise<boolean>;

    // Newsletter
    getNewsletterSubscriptionByEmail(email: string): Promise<NewsletterSubscription | undefined>;
    createNewsletterSubscription(subscription: Partial<NewsletterSubscription>): Promise<NewsletterSubscription>;
    getNewsletterSubscriptions(): Promise<NewsletterSubscription[]>;

    // Journey Plans
    getJourneyPlan(userId?: string, sessionId?: string): Promise<JourneyPlan | undefined>;
    createJourneyPlan(plan: Partial<JourneyPlan>): Promise<JourneyPlan>;
    updateJourneyPlan(id: string, updates: Partial<JourneyPlan>): Promise<JourneyPlan | undefined>;
    deleteJourneyPlan(userId?: string, sessionId?: string): Promise<boolean>;

    seedGalleryIfNeeded(): Promise<void>;
}
import { getDb } from "../db.js";

// Combine all repository classes into one interface implementation for backward compatibility
// using mixins or simple aggregation

class CombinedStorage implements IStorage {
    private userStorage = new UserStorage();
    private productStorage = new ProductStorage();
    private orderStorage = new OrderStorage();

    // User Delegation
    getUser = this.userStorage.getUser.bind(this.userStorage);
    getUserByEmail = this.userStorage.getUserByEmail.bind(this.userStorage);
    getUsers = this.userStorage.getUsers.bind(this.userStorage);
    createUser = this.userStorage.createUser.bind(this.userStorage);
    updateUser = this.userStorage.updateUser.bind(this.userStorage);
    createUserAddress = this.userStorage.createUserAddress.bind(this.userStorage);
    getUserAddresses = this.userStorage.getUserAddresses.bind(this.userStorage);
    createPasswordResetToken = this.userStorage.createPasswordResetToken.bind(this.userStorage);
    verifyPasswordResetToken = this.userStorage.verifyPasswordResetToken.bind(this.userStorage);
    deletePasswordResetToken = this.userStorage.deletePasswordResetToken.bind(this.userStorage);
    processPasswordReset = this.userStorage.processPasswordReset.bind(this.userStorage);
    getNewsletterSubscriptionByEmail = this.userStorage.getNewsletterSubscriptionByEmail.bind(this.userStorage);
    createNewsletterSubscription = this.userStorage.createNewsletterSubscription.bind(this.userStorage);
    getNewsletterSubscriptions = this.userStorage.getNewsletterSubscriptions.bind(this.userStorage);

    // Product Delegation
    getProducts = this.productStorage.getProducts.bind(this.productStorage);
    getProductAttributes = this.productStorage.getProductAttributes.bind(this.productStorage);
    getProduct = this.productStorage.getProduct.bind(this.productStorage);
    getProductBySlug = this.productStorage.getProductBySlug.bind(this.productStorage);
    createProduct = this.productStorage.createProduct.bind(this.productStorage);
    updateProduct = this.productStorage.updateProduct.bind(this.productStorage);
    deleteProduct = this.productStorage.deleteProduct.bind(this.productStorage);
    getReviews = this.productStorage.getReviews.bind(this.productStorage);
    getReview = this.productStorage.getReview.bind(this.productStorage);
    createReview = this.productStorage.createReview.bind(this.productStorage);
    updateReview = this.productStorage.updateReview.bind(this.productStorage);
    deleteReview = this.productStorage.deleteReview.bind(this.productStorage);
    markReviewHelpful = this.productStorage.markReviewHelpful.bind(this.productStorage);
    updateProductRating = this.productStorage.updateProductRating.bind(this.productStorage);
    getDiscounts = this.productStorage.getDiscounts.bind(this.productStorage);
    getDiscount = this.productStorage.getDiscount.bind(this.productStorage);
    createDiscount = this.productStorage.createDiscount.bind(this.productStorage);
    updateDiscount = this.productStorage.updateDiscount.bind(this.productStorage);
    deleteDiscount = this.productStorage.deleteDiscount.bind(this.productStorage);
    getAllFishSpecies = this.productStorage.getAllFishSpecies.bind(this.productStorage);
    getFishSpecies = this.productStorage.getAllFishSpecies.bind(this.productStorage);
    getFishSpeciesById = this.productStorage.getFishSpeciesById.bind(this.productStorage);
    seedFishSpeciesIfNeeded = this.productStorage.seedFishSpeciesIfNeeded.bind(this.productStorage);

    // Order Delegation
    getOrders = this.orderStorage.getOrders.bind(this.orderStorage);
    getOrder = this.orderStorage.getOrder.bind(this.orderStorage);
    createOrder = this.orderStorage.createOrder.bind(this.orderStorage);
    updateOrder = this.orderStorage.updateOrder.bind(this.orderStorage);
    createOrderSecure = this.orderStorage.createOrderSecure.bind(this.orderStorage);
    createPayment = this.orderStorage.createPayment.bind(this.orderStorage);
    getCoupons = this.orderStorage.getCoupons.bind(this.orderStorage);
    getCoupon = this.orderStorage.getCoupon.bind(this.orderStorage);
    getCouponByCode = this.orderStorage.getCouponByCode.bind(this.orderStorage);
    getCouponsByUserId = this.orderStorage.getCouponsByUserId.bind(this.orderStorage);
    createCoupon = this.orderStorage.createCoupon.bind(this.orderStorage);
    updateCoupon = this.orderStorage.updateCoupon.bind(this.orderStorage);
    deleteCoupon = this.orderStorage.deleteCoupon.bind(this.orderStorage);
    createAuditLog = this.orderStorage.createAuditLog.bind(this.orderStorage);
    getAuditLogs = this.orderStorage.getAuditLogs.bind(this.orderStorage);
    getCartItems = this.orderStorage.getCartItems.bind(this.orderStorage);
    addToCart = this.orderStorage.addToCart.bind(this.orderStorage);
    updateCartItem = this.orderStorage.updateCartItem.bind(this.orderStorage);
    removeFromCart = this.orderStorage.removeFromCart.bind(this.orderStorage);
    clearCart = this.orderStorage.clearCart.bind(this.orderStorage);
    getFavorites = this.orderStorage.getFavorites.bind(this.orderStorage);
    addFavorite = this.orderStorage.addFavorite.bind(this.orderStorage);
    removeFavorite = this.orderStorage.removeFavorite.bind(this.orderStorage);
    getGallerySubmissions = this.orderStorage.getGallerySubmissions.bind(this.orderStorage);
    createGallerySubmission = this.orderStorage.createGallerySubmission.bind(this.orderStorage);
    approveGallerySubmission = this.orderStorage.approveGallerySubmission.bind(this.orderStorage);
    voteGallerySubmission = this.orderStorage.voteGallerySubmission.bind(this.orderStorage);
    deleteGallerySubmission = this.orderStorage.deleteGallerySubmission.bind(this.orderStorage);
    setGalleryWinner = this.orderStorage.setGalleryWinner.bind(this.orderStorage);
    markCelebrationSeen = this.orderStorage.markCelebrationSeen.bind(this.orderStorage);
    getCurrentGalleryPrize = this.orderStorage.getCurrentGalleryPrize.bind(this.orderStorage);
    createOrUpdateGalleryPrize = this.orderStorage.createOrUpdateGalleryPrize.bind(this.orderStorage);
    getGalleryPrizeByMonth = this.orderStorage.getGalleryPrizeByMonth.bind(this.orderStorage);
    getTopSellingProducts = this.productStorage.getTopSellingProducts.bind(this.productStorage);

    // Missing Stubs - Now Implemented
    seedProductsIfNeeded = async () => {
        // Can be implemented later for seeding initial products
        // For now, products are added via admin panel
    };

    getTrendingProducts = async (): Promise<Product[]> => {
        try {
            // Strategy: Get best-selling and highly-rated products with stock
            const products = await this.productStorage.getProducts({
                limit: 10,
                sortBy: 'rating',
                sortOrder: 'desc'
            });

            // Filter products with stock and good ratings
            return products
                .filter(p => (p.stock ?? 0) > 0 && parseFloat(String(p.rating)) >= 4.0)
                .slice(0, 8);
        } catch (error) {
            console.error('Error getting trending products:', error);
            return [];
        }
    };

    getFrequentlyBoughtTogether = async (productId: string): Promise<Product[]> => {
        try {
            // Strategy: Get products from the same category
            // In future: analyze order data for co-purchased items
            const product = await this.productStorage.getProduct(productId);
            if (!product) return [];

            const categoryProducts = await this.productStorage.getProducts({
                category: product.category,
                limit: 6
            });

            // Return similar products excluding the current one
            return categoryProducts
                .filter(p => p.id !== productId && (p.stock ?? 0) > 0)
                .slice(0, 4);
        } catch (error) {
            console.error('Error getting frequently bought together:', error);
            return [];
        }
    };

    getSimilarProducts = async (productId: string): Promise<Product[]> => {
        try {
            const product = await this.productStorage.getProduct(productId);
            if (!product) return [];

            // Get products from same category and subcategory if possible
            const categoryProducts = await this.productStorage.getProducts({
                category: product.category,
                limit: 8
            });

            // Prioritize same subcategory, then same category
            const sameSubcategory = categoryProducts.filter(
                p => p.id !== productId &&
                    p.subcategory === product.subcategory &&
                    (p.stock ?? 0) > 0
            );

            const sameCategory = categoryProducts.filter(
                p => p.id !== productId &&
                    p.subcategory !== product.subcategory &&
                    (p.stock ?? 0) > 0
            );

            return [...sameSubcategory, ...sameCategory].slice(0, 5);
        } catch (error) {
            console.error('Error getting similar products:', error);
            return [];
        }
    };

    seedGalleryIfNeeded = this.orderStorage.seedGalleryIfNeeded.bind(this.orderStorage);

    // Journey Plans Methods
    getJourneyPlan = async (userId?: string, sessionId?: string): Promise<JourneyPlan | undefined> => {
        const db = getDb();
        if (!db) return undefined;

        const { journeyPlans } = await import("../../shared/schema.js");
        const { eq, or } = await import("drizzle-orm");

        // Prioritize userId if available, fall back to sessionId
        const conditions = [];
        if (userId) conditions.push(eq(journeyPlans.userId, userId));
        if (sessionId) conditions.push(eq(journeyPlans.sessionId, sessionId));

        if (conditions.length === 0) return undefined;

        const plans = await db.select().from(journeyPlans).where(
            userId ? eq(journeyPlans.userId, userId) : eq(journeyPlans.sessionId, sessionId!)
        ).limit(1);

        return plans[0];
    };

    createJourneyPlan = async (plan: Partial<JourneyPlan>): Promise<JourneyPlan> => {
        const db = getDb();
        if (!db) throw new Error("Database not available");

        const { journeyPlans } = await import("../../shared/schema.js");

        const [newPlan] = await db.insert(journeyPlans).values(plan as any).returning();
        return newPlan;
    };

    updateJourneyPlan = async (id: string, updates: Partial<JourneyPlan>): Promise<JourneyPlan | undefined> => {
        const db = getDb();
        if (!db) return undefined;

        const { journeyPlans } = await import("../../shared/schema.js");
        const { eq } = await import("drizzle-orm");

        const [updated] = await db.update(journeyPlans)
            .set({ ...updates, updatedAt: new Date() })
            .where(eq(journeyPlans.id, id))
            .returning();

        return updated;
    };

    deleteJourneyPlan = async (userId?: string, sessionId?: string): Promise<boolean> => {
        const db = getDb();
        if (!db) return false;

        const { journeyPlans } = await import("../../shared/schema.js");
        const { eq } = await import("drizzle-orm");

        if (userId) {
            await db.delete(journeyPlans).where(eq(journeyPlans.userId, userId));
        } else if (sessionId) {
            await db.delete(journeyPlans).where(eq(journeyPlans.sessionId, sessionId));
        }

        return true;
    };
}

export const storage = new CombinedStorage();
