/**
 * AI Tools - أدوات وكيل المبيعات الذكي
 * Tools that the AI agent can use to take actions
 */

import { getDb } from "../db.js";
import * as schema from "../../shared/schema.js";
import { eq, ilike, and, desc, sql } from "drizzle-orm";

// ============================================================
// TOOL DEFINITIONS - تعريف الأدوات المتاحة للـ AI
// ============================================================

export const AI_TOOLS = [
    {
        name: "search_products",
        description: "البحث عن منتجات بالاسم أو الفئة أو العلامة التجارية",
        parameters: {
            type: "object",
            properties: {
                query: { type: "string", description: "كلمة البحث" },
                category: { type: "string", description: "الفئة (اختياري)" },
                brand: { type: "string", description: "العلامة التجارية (اختياري)" },
                limit: { type: "number", description: "عدد النتائج (افتراضي 5)" },
            },
            required: ["query"],
        },
    },
    {
        name: "check_stock",
        description: "التحقق من توفر منتج معين في المخزون",
        parameters: {
            type: "object",
            properties: {
                productId: { type: "string", description: "معرف المنتج" },
            },
            required: ["productId"],
        },
    },
    {
        name: "get_customer_history",
        description: "جلب تاريخ تفاعلات العميل السابقة",
        parameters: {
            type: "object",
            properties: {
                userId: { type: "string", description: "معرف المستخدم" },
            },
            required: ["userId"],
        },
    },
    {
        name: "get_recommendations",
        description: "الحصول على توصيات مخصصة للعميل",
        parameters: {
            type: "object",
            properties: {
                userId: { type: "string", description: "معرف المستخدم (اختياري)" },
                category: { type: "string", description: "الفئة المطلوبة (اختياري)" },
                priceMax: { type: "number", description: "الحد الأقصى للسعر (اختياري)" },
            },
        },
    },
    {
        name: "add_to_cart",
        description: "إضافة منتج لسلة العميل",
        parameters: {
            type: "object",
            properties: {
                userId: { type: "string", description: "معرف المستخدم" },
                productId: { type: "string", description: "معرف المنتج" },
                quantity: { type: "number", description: "الكمية (افتراضي 1)" },
            },
            required: ["userId", "productId"],
        },
    },
    {
        name: "apply_coupon",
        description: "التحقق من كوبون وتطبيقه",
        parameters: {
            type: "object",
            properties: {
                couponCode: { type: "string", description: "كود الكوبون" },
            },
            required: ["couponCode"],
        },
    },
];

// ============================================================
// TOOL IMPLEMENTATIONS - تنفيذ الأدوات
// ============================================================

export class AIToolsExecutor {
    private db = getDb();

    /**
     * البحث عن منتجات
     */
    async searchProducts(params: {
        query: string;
        category?: string;
        brand?: string;
        limit?: number;
    }) {
        try {
            const db = this.db;
            if (!db) return { success: false, error: "Database not available" };

            const limit = params.limit || 5;

            let products = await db
                .select({
                    id: schema.products.id,
                    name: schema.products.name,
                    brand: schema.products.brand,
                    category: schema.products.category,
                    price: schema.products.price,
                    stock: schema.products.stock,
                    thumbnail: schema.products.thumbnail,
                    rating: schema.products.rating,
                })
                .from(schema.products)
                .where(
                    and(
                        ilike(schema.products.name, `%${params.query}%`),
                        params.category ? eq(schema.products.category, params.category) : undefined,
                        params.brand ? eq(schema.products.brand, params.brand) : undefined
                    )
                )
                .limit(limit);

            return {
                success: true,
                data: products,
                count: products.length,
            };
        } catch (error) {
            console.error("searchProducts error:", error);
            return { success: false, error: "Search failed" };
        }
    }

    /**
     * فحص المخزون
     */
    async checkStock(params: { productId: string }) {
        try {
            const db = this.db;
            if (!db) return { success: false, error: "Database not available" };

            const [product] = await db
                .select({
                    id: schema.products.id,
                    name: schema.products.name,
                    stock: schema.products.stock,
                    lowStockThreshold: schema.products.lowStockThreshold,
                })
                .from(schema.products)
                .where(eq(schema.products.id, params.productId));

            if (!product) {
                return { success: false, error: "Product not found" };
            }

            const isLowStock = product.stock <= product.lowStockThreshold;
            const isOutOfStock = product.stock === 0;

            return {
                success: true,
                data: {
                    ...product,
                    isLowStock,
                    isOutOfStock,
                    status: isOutOfStock ? "نفذ" : isLowStock ? "مخزون منخفض" : "متوفر",
                },
            };
        } catch (error) {
            console.error("checkStock error:", error);
            return { success: false, error: "Stock check failed" };
        }
    }

    /**
     * جلب تاريخ العميل
     */
    async getCustomerHistory(params: { userId: string }) {
        try {
            const db = this.db;
            if (!db) return { success: false, error: "Database not available" };

            // جلب ملف العميل
            const [profile] = await db
                .select()
                .from(schema.customerProfiles)
                .where(eq(schema.customerProfiles.userId, params.userId));

            // جلب المنتجات المفضلة
            const favorites = await db
                .select({
                    productId: schema.favorites.productId,
                    productName: schema.products.name,
                })
                .from(schema.favorites)
                .innerJoin(schema.products, eq(schema.favorites.productId, schema.products.id))
                .where(eq(schema.favorites.userId, params.userId))
                .limit(10);

            // جلب آخر الطلبات
            const orders = await db
                .select({
                    id: schema.orders.id,
                    total: schema.orders.total,
                    status: schema.orders.status,
                    createdAt: schema.orders.createdAt,
                })
                .from(schema.orders)
                .where(eq(schema.orders.userId, params.userId))
                .orderBy(desc(schema.orders.createdAt))
                .limit(5);

            // جلب آخر المحادثات
            const recentChats = await db
                .select({
                    content: schema.chatMessages.content,
                    role: schema.chatMessages.role,
                    createdAt: schema.chatMessages.createdAt,
                })
                .from(schema.chatMessages)
                .where(eq(schema.chatMessages.userId, params.userId))
                .orderBy(desc(schema.chatMessages.createdAt))
                .limit(10);

            return {
                success: true,
                data: {
                    profile: profile || null,
                    favorites,
                    recentOrders: orders,
                    recentChats,
                    summary: profile?.aiSummary || null,
                },
            };
        } catch (error) {
            console.error("getCustomerHistory error:", error);
            return { success: false, error: "Failed to get customer history" };
        }
    }

    /**
     * توصيات مخصصة
     */
    async getRecommendations(params: {
        userId?: string;
        category?: string;
        priceMax?: number;
    }) {
        try {
            const db = this.db;
            if (!db) return { success: false, error: "Database not available" };

            let preferredCategories: string[] = [];
            let preferredBrands: string[] = [];

            // جلب تفضيلات العميل إذا كان مسجلاً
            if (params.userId) {
                const [profile] = await db
                    .select()
                    .from(schema.customerProfiles)
                    .where(eq(schema.customerProfiles.userId, params.userId));

                if (profile) {
                    preferredCategories = profile.preferredCategories || [];
                    preferredBrands = profile.preferredBrands || [];
                }
            }

            // بناء استعلام التوصيات
            let products = await db
                .select({
                    id: schema.products.id,
                    name: schema.products.name,
                    price: schema.products.price,
                    category: schema.products.category,
                    brand: schema.products.brand,
                    thumbnail: schema.products.thumbnail,
                    rating: schema.products.rating,
                })
                .from(schema.products)
                .where(
                    and(
                        params.category ? eq(schema.products.category, params.category) : undefined,
                        params.priceMax ? sql`${schema.products.price}::numeric <= ${params.priceMax}` : undefined
                    )
                )
                .orderBy(desc(schema.products.rating))
                .limit(6);

            // ترتيب حسب تفضيلات العميل
            if (preferredCategories.length > 0 || preferredBrands.length > 0) {
                products = products.sort((a, b) => {
                    const aScore =
                        (preferredCategories.includes(a.category) ? 2 : 0) +
                        (preferredBrands.includes(a.brand) ? 1 : 0);
                    const bScore =
                        (preferredCategories.includes(b.category) ? 2 : 0) +
                        (preferredBrands.includes(b.brand) ? 1 : 0);
                    return bScore - aScore;
                });
            }

            return {
                success: true,
                data: products,
                personalized: params.userId ? true : false,
            };
        } catch (error) {
            console.error("getRecommendations error:", error);
            return { success: false, error: "Failed to get recommendations" };
        }
    }

    /**
     * إضافة للسلة
     */
    async addToCart(params: {
        userId: string;
        productId: string;
        quantity?: number;
    }) {
        try {
            const db = this.db;
            if (!db) return { success: false, error: "Database not available" };

            const quantity = params.quantity || 1;

            // التحقق من وجود المنتج
            const [product] = await db
                .select()
                .from(schema.products)
                .where(eq(schema.products.id, params.productId));

            if (!product) {
                return { success: false, error: "المنتج غير موجود" };
            }

            if (product.stock < quantity) {
                return { success: false, error: "الكمية المطلوبة غير متوفرة" };
            }

            // التحقق من وجود العنصر في السلة
            const [existingItem] = await db
                .select()
                .from(schema.cartItems)
                .where(
                    and(
                        eq(schema.cartItems.userId, params.userId),
                        eq(schema.cartItems.productId, params.productId)
                    )
                );

            if (existingItem) {
                // تحديث الكمية
                await db
                    .update(schema.cartItems)
                    .set({ quantity: existingItem.quantity + quantity })
                    .where(eq(schema.cartItems.id, existingItem.id));
            } else {
                // إضافة عنصر جديد
                await db.insert(schema.cartItems).values({
                    userId: params.userId,
                    productId: params.productId,
                    quantity,
                });
            }

            return {
                success: true,
                message: `تم إضافة ${product.name} للسلة ✓`,
                data: { productName: product.name, quantity },
            };
        } catch (error) {
            console.error("addToCart error:", error);
            return { success: false, error: "فشل في الإضافة للسلة" };
        }
    }

    /**
     * التحقق من كوبون
     */
    async applyCoupon(params: { couponCode: string }) {
        try {
            const db = this.db;
            if (!db) return { success: false, error: "Database not available" };

            const [coupon] = await db
                .select()
                .from(schema.coupons)
                .where(eq(schema.coupons.code, params.couponCode.toUpperCase()));

            if (!coupon) {
                return { success: false, error: "كود الكوبون غير صالح" };
            }

            if (!coupon.isActive) {
                return { success: false, error: "الكوبون غير نشط" };
            }

            const now = new Date();
            if (coupon.startDate && now < coupon.startDate) {
                return { success: false, error: "الكوبون لم يبدأ بعد" };
            }
            if (coupon.endDate && now > coupon.endDate) {
                return { success: false, error: "الكوبون منتهي الصلاحية" };
            }

            if (coupon.maxUses && coupon.usedCount && coupon.usedCount >= coupon.maxUses) {
                return { success: false, error: "تم استخدام الكوبون الحد الأقصى" };
            }

            return {
                success: true,
                data: {
                    code: coupon.code,
                    type: coupon.type,
                    value: coupon.value,
                    description: coupon.description,
                    minOrderAmount: coupon.minOrderAmount,
                },
                message: `كوبون ${coupon.code} صالح - خصم ${coupon.type === 'percentage' ? coupon.value + '%' : coupon.value + ' د.ع'}`,
            };
        } catch (error) {
            console.error("applyCoupon error:", error);
            return { success: false, error: "فشل في التحقق من الكوبون" };
        }
    }

    /**
     * تنفيذ أداة بناءً على اسمها
     */
    async executeTool(toolName: string, params: any): Promise<any> {
        switch (toolName) {
            case "search_products":
                return this.searchProducts(params);
            case "check_stock":
                return this.checkStock(params);
            case "get_customer_history":
                return this.getCustomerHistory(params);
            case "get_recommendations":
                return this.getRecommendations(params);
            case "add_to_cart":
                return this.addToCart(params);
            case "apply_coupon":
                return this.applyCoupon(params);
            default:
                return { success: false, error: `Unknown tool: ${toolName}` };
        }
    }
}

// مثيل واحد مشترك
export const aiToolsExecutor = new AIToolsExecutor();
