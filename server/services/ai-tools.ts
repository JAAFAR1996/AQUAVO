/**
 * AI Tools - أدوات وكيل المبيعات الذكي
 * Tools that the AI agent can use to take actions
 */

import { getDb } from "../db.js";
import * as schema from "../../shared/schema.js";
import { eq, ilike, and, or, desc, sql } from "drizzle-orm";
// Canonical money primitives — the AI must never quote a figure derived by a
// local formula. `toMoney` replaces scattered parseFloat() on price columns
// (NaN-safe); `orderCollectedAmount` is the ONE "what the customer paid" rule.
import { toMoney, orderCollectedAmount } from "../../shared/order-financials.js";

// ============================================================
// TOOL DEFINITIONS - تعريف الأدوات المتاحة للـ AI
// ============================================================

export const AI_TOOLS = [
    {
        name: "search_products",
        description: "Search products by name, category or brand. Use Arabic keywords for the query.",
        parameters: {
            type: "object",
            properties: {
                query: { type: "string", description: "Search keyword in Arabic (e.g. فلتر, حوض, طعام)" },
                category: { type: "string", description: "Category filter (optional)" },
                brand: { type: "string", description: "Brand filter (optional)" },
                limit: { type: "number", description: "Number of results (default 8)" },
            },
            required: ["query"],
        },
    },
    {
        name: "check_stock",
        description: "Check if a product is in stock by its ID.",
        parameters: {
            type: "object",
            properties: {
                productId: { type: "string", description: "Product ID" },
            },
            required: ["productId"],
        },
    },
    {
        name: "get_customer_history",
        description: "Get customer purchase history and preferences.",
        parameters: {
            type: "object",
            properties: {
                userId: { type: "string", description: "User ID" },
            },
            required: ["userId"],
        },
    },
    {
        name: "get_recommendations",
        description: "Get personalized product recommendations for a customer.",
        parameters: {
            type: "object",
            properties: {
                userId: { type: "string", description: "User ID (optional)" },
                category: { type: "string", description: "Category filter (optional)" },
                priceMax: { type: "number", description: "Max price in IQD (optional)" },
            },
        },
    },
    {
        name: "add_to_cart",
        description: "Add a product to customer's cart. Only use when customer explicitly asks.",
        parameters: {
            type: "object",
            properties: {
                userId: { type: "string", description: "User ID" },
                productId: { type: "string", description: "Product ID" },
                quantity: { type: "number", description: "Quantity (default 1)" },
            },
            required: ["userId", "productId"],
        },
    },
    {
        name: "apply_coupon",
        description: "Validate and apply a coupon code.",
        parameters: {
            type: "object",
            properties: {
                couponCode: { type: "string", description: "Coupon code string" },
            },
            required: ["couponCode"],
        },
    },
    {
        name: "get_product_details",
        description: "Get full details of a specific product (description, images, price, discount).",
        parameters: {
            type: "object",
            properties: {
                productId: { type: "string", description: "Product ID" },
            },
            required: ["productId"],
        },
    },
    {
        name: "get_deals",
        description: "Get products currently on sale/discount.",
        parameters: {
            type: "object",
            properties: {
                limit: { type: "number", description: "Number of deals to return (default 5)" },
            },
        },
    },
];

// ============================================================
// TOOL IMPLEMENTATIONS - تنفيذ الأدوات
// ============================================================

// English-to-Arabic keyword map for tool calling compatibility
const EN_TO_AR_MAP: Record<string, string[]> = {
    "filter": ["فلتر", "فلاتر"],
    "aquarium": ["حوض", "أحواض"],
    "tank": ["حوض", "أحواض"],
    "food": ["طعام", "غذاء", "أكل"],
    "fish": ["سمك", "أسماك", "سمكة"],
    "heater": ["سخان", "سخانات"],
    "light": ["إضاءة", "ضوء", "led"],
    "lighting": ["إضاءة", "ضوء", "led"],
    "decoration": ["ديكور", "ديكورات", "زينة"],
    "pump": ["مضخة", "مضخات"],
    "air pump": ["مضخة هواء"],
    "treatment": ["معالج", "معالجات", "علاج", "دواء"],
    "plant": ["نبات", "نباتات"],
    "gravel": ["حصى", "رمل"],
    "substrate": ["حصى", "رمل"],
    "cleaning": ["تنظيف", "صيانة"],
    "maintenance": ["صيانة", "تنظيف"],
    "net": ["شبكة"],
    "thermometer": ["ميزان حرارة"],
    "water": ["ماء", "مياه"],
    "brush": ["فرشاة"],
    "magnetic": ["مغناطيس"],
    "incubator": ["حاضنة"],
    "sponge": ["اسفنج", "سفنج"],
    "cotton": ["قطن"],
    "betta": ["بيتا"],
    "goldfish": ["ذهبية", "جولد فش"],
    "shrimp": ["روبيان", "جمبري"],
    "koi": ["كوي"],
    "algae": ["طحالب"],
    "ammonia": ["أمونيا"],
    "test": ["فحص", "اختبار"],
};

/**
 * Expand English query to include Arabic equivalents
 */
function expandQuery(query: string): string[] {
    const lower = query.toLowerCase().trim();
    const queries = [query]; // Always include original

    // Check if query is English and map to Arabic
    for (const [en, arList] of Object.entries(EN_TO_AR_MAP)) {
        if (lower.includes(en)) {
            queries.push(...arList);
        }
    }

    // If query contains ?, it's corrupted Arabic - skip it
    if (query.includes("?")) {
        return Object.values(EN_TO_AR_MAP).flat().slice(0, 3); // Return generic terms
    }

    return [...new Set(queries)];
}

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

            const limit = params.limit || 8;
            const query = params.query;
            const expandedQueries = expandQuery(query);

            // Multi-field search with English-to-Arabic expansion
            const searchConditions = expandedQueries.flatMap(q => [
                ilike(schema.products.name, `%${q}%`),
                ilike(schema.products.description, `%${q}%`),
                ilike(schema.products.category, `%${q}%`),
                ilike(schema.products.brand, `%${q}%`),
            ]);

            let products = await db
                .select({
                    id: schema.products.id,
                    name: schema.products.name,
                    slug: schema.products.slug,
                    brand: schema.products.brand,
                    category: schema.products.category,
                    price: schema.products.price,
                    originalPrice: schema.products.originalPrice,
                    stock: schema.products.stock,
                    thumbnail: schema.products.thumbnail,
                    rating: schema.products.rating,
                    description: schema.products.description,
                    hasVariants: schema.products.hasVariants,
                    variants: schema.products.variants,
                })
                .from(schema.products)
                .where(
                    and(
                        or(...searchConditions),
                        params.category ? ilike(schema.products.category, `%${params.category}%`) : undefined,
                        params.brand ? ilike(schema.products.brand, `%${params.brand}%`) : undefined
                    )
                )
                .orderBy(desc(schema.products.rating))
                .limit(limit);

            // If no results, try semantic search via embeddings
            if (products.length === 0) {
                try {
                    const { embeddingGenerator } = await import("./embedding-generator.js");
                    const semanticResults = await embeddingGenerator.semanticSearch(query, limit);
                    const relevant = semanticResults.filter(r => r.similarity > 0.5);

                    if (relevant.length > 0) {
                        const semanticProducts = await Promise.all(
                            relevant.slice(0, limit).map(async (r) => {
                                const [p] = await db.select({
                                    id: schema.products.id,
                                    name: schema.products.name,
                                    slug: schema.products.slug,
                                    brand: schema.products.brand,
                                    category: schema.products.category,
                                    price: schema.products.price,
                                    originalPrice: schema.products.originalPrice,
                                    stock: schema.products.stock,
                                    thumbnail: schema.products.thumbnail,
                                    rating: schema.products.rating,
                                    description: schema.products.description,
                                }).from(schema.products).where(eq(schema.products.id, r.productId));
                                return p;
                            })
                        );
                        products = semanticProducts.filter(Boolean) as typeof products;
                    }
                } catch {
                    // Semantic search is optional fallback
                }
            }

            // Return clean data for AI (trim description to save tokens)
            const cleanProducts = products.map(p => {
                // For products with variants, expose the price range so AI can answer price queries
                let priceDisplay = p.price;
                let variantPrices: string | null = null;
                if (p.hasVariants && Array.isArray(p.variants) && p.variants.length > 0) {
                    const prices = (p.variants as any[]).map(v => toMoney(v.price)).filter(n => n > 0);
                    if (prices.length > 0) {
                        const minP = Math.min(...prices);
                        const maxP = Math.max(...prices);
                        priceDisplay = String(minP);
                        variantPrices = prices.length > 1
                            ? `${minP.toLocaleString()} - ${maxP.toLocaleString()} د.ع (حسب الخيار)`
                            : `${minP.toLocaleString()} د.ع`;
                    }
                }
                return {
                    id: p.id,
                    name: p.name,
                    slug: p.slug,
                    brand: p.brand,
                    category: p.category,
                    price: priceDisplay,
                    priceDisplay: variantPrices ?? (toMoney(p.price) > 0 ? `${Math.round(toMoney(p.price)).toLocaleString()} د.ع` : "اتصل للسعر"),
                    stock: p.stock,
                    rating: p.rating,
                    thumbnail: p.thumbnail,
                    hasVariants: p.hasVariants,
                    description: p.description ? p.description.slice(0, 150) + "..." : null,
                    hasDiscount: !!p.originalPrice && toMoney(p.originalPrice) > toMoney(p.price),
                };
            });

            return {
                success: true,
                data: cleanProducts,
                count: cleanProducts.length,
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
                    roundedTotal: schema.orders.roundedTotal,
                    status: schema.orders.status,
                    createdAt: schema.orders.createdAt,
                })
                .from(schema.orders)
                .where(eq(schema.orders.userId, params.userId))
                .orderBy(desc(schema.orders.createdAt))
                .limit(5);

            // The AI must quote what the customer ACTUALLY paid. Raw `total` is
            // pre-rounding and is not the collected amount — expose the canonical
            // collectedAmount alongside it so the bot cannot cite a third figure.
            const recentOrders = orders.map((o) => ({
                ...o,
                collectedAmount: orderCollectedAmount(o),
            }));

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
                    recentOrders,
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
     * تفاصيل منتج كاملة
     */
    async getProductDetails(params: { productId: string }) {
        try {
            const db = this.db;
            if (!db) return { success: false, error: "Database not available" };

            const [product] = await db
                .select()
                .from(schema.products)
                .where(eq(schema.products.id, params.productId));

            if (!product) {
                return { success: false, error: "المنتج غير موجود" };
            }

            return {
                success: true,
                data: {
                    id: product.id,
                    name: product.name,
                    slug: product.slug,
                    brand: product.brand,
                    category: product.category,
                    description: product.description,
                    price: product.price,
                    originalPrice: product.originalPrice,
                    hasDiscount: !!product.originalPrice && toMoney(product.originalPrice) > toMoney(product.price),
                    discountPercent: toMoney(product.originalPrice) > 0
                        ? Math.round(((toMoney(product.originalPrice) - toMoney(product.price)) / toMoney(product.originalPrice)) * 100)
                        : 0,
                    stock: product.stock,
                    rating: product.rating,
                    thumbnail: product.thumbnail,
                    images: product.images,
                },
            };
        } catch (error) {
            console.error("getProductDetails error:", error);
            return { success: false, error: "Failed to get product details" };
        }
    }

    /**
     * العروض والتخفيضات الحالية
     */
    async getDeals(params: { limit?: number }) {
        try {
            const db = this.db;
            if (!db) return { success: false, error: "Database not available" };

            const limit = params.limit || 5;

            // Products with originalPrice > price (discounted)
            const deals = await db
                .select({
                    id: schema.products.id,
                    name: schema.products.name,
                    slug: schema.products.slug,
                    price: schema.products.price,
                    originalPrice: schema.products.originalPrice,
                    category: schema.products.category,
                    thumbnail: schema.products.thumbnail,
                    stock: schema.products.stock,
                })
                .from(schema.products)
                .where(
                    and(
                        sql`${schema.products.originalPrice}::numeric > ${schema.products.price}::numeric`,
                        sql`${schema.products.stock} > 0`
                    )
                )
                .orderBy(sql`(${schema.products.originalPrice}::numeric - ${schema.products.price}::numeric) / ${schema.products.originalPrice}::numeric DESC`)
                .limit(limit);

            const dealsWithDiscount = deals.map(d => ({
                ...d,
                discountPercent: toMoney(d.originalPrice) > 0
                    ? Math.round(((toMoney(d.originalPrice) - toMoney(d.price)) / toMoney(d.originalPrice)) * 100)
                    : 0,
            }));

            return {
                success: true,
                data: dealsWithDiscount,
                count: dealsWithDiscount.length,
                message: dealsWithDiscount.length > 0
                    ? `عدنا ${dealsWithDiscount.length} عروض حالياً! 🔥`
                    : "لا توجد عروض حالياً",
            };
        } catch (error) {
            console.error("getDeals error:", error);
            return { success: false, error: "Failed to get deals" };
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
            case "get_product_details":
                return this.getProductDetails(params);
            case "get_deals":
                return this.getDeals(params);
            default:
                return { success: false, error: `Unknown tool: ${toolName}` };
        }
    }
}

// مثيل واحد مشترك
export const aiToolsExecutor = new AIToolsExecutor();

// Groq-compatible tool definitions format
export const GROQ_TOOLS = AI_TOOLS.map(tool => ({
    type: "function" as const,
    function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
    },
}));
