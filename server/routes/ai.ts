import { Router, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { sendMessage, ChatMessage, ChatContext, recommendProductsForJourney } from "../services/gemini-ai.js";
import { getDb } from "../db.js";
import * as schema from "../../shared/schema.js";
import { count, lt, and, gt, or, ilike, desc, eq, inArray } from "drizzle-orm";

const router = Router();

// Rate Limiting للحماية من الاستخدام المفرط
const aiRateLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 دقيقة
    max: 20, // 20 طلب في الدقيقة لكل مستخدم
    message: {
        success: false,
        error: "تم تجاوز الحد المسموح من الطلبات. حاول مرة أخرى بعد دقيقة.",
        retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    validate: false, // Disable IPv6 validation warning
});

// Rate Limiter أقوى للـ health check (منع الإساءة)
const healthRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5, // 5 طلبات فقط في الدقيقة
    message: {
        success: false,
        error: "تم تجاوز الحد المسموح",
    },
});

// Helper: Find relevant products based on keywords
async function findRelevantProducts(message: string, limit: number = 5) {
    const db = getDb();
    if (!db) return [];

    try {
        // Extract keywords from user message
        const keywords = [
            { term: "معالج", categories: ["معالجات الماء", "صيانة"] },
            { term: "فلتر", categories: ["فلاتر"] },
            { term: "حوض", categories: ["أحواض"] },
            { term: "سمك", categories: ["أسماك"] },
            { term: "طعام", categories: ["طعام"] },
            { term: "نبات", categories: ["نباتات"] },
            { term: "ضوء", categories: ["إضاءة"] },
            { term: "سخان", categories: ["سخانات"] },
            { term: "مضخ", categories: ["مضخات"] },
            { term: "ديكور", categories: ["ديكورات"] },
        ];

        // Find matching keywords
        const matchedCategories: string[] = [];
        for (const { term, categories } of keywords) {
            if (message.includes(term)) {
                matchedCategories.push(...categories);
            }
        }

        // If keywords found, search by category
        if (matchedCategories.length > 0) {
            const conditions = matchedCategories.map(cat =>
                ilike(schema.products.category, `%${cat}%`)
            );

            const products = await db
                .select()
                .from(schema.products)
                .where(or(...conditions))
                .orderBy(desc(schema.products.rating))
                .limit(limit);

            return products;
        }

        // No keywords matched - return empty array (don't suggest products without request)
        return [];
    } catch (error) {
        console.error("Error finding products:", error);
        return [];
    }
}

// POST /api/ai/chat - Chat with Gemini AI
router.post("/chat", aiRateLimiter, async (req: Request, res: Response) => {
    try {
        const { message, history = [], userName, userId } = req.body as {
            message: string;
            history?: ChatMessage[];
            userName?: string;
            userId?: string;
        };

        if (!message || typeof message !== "string") {
            return res.status(400).json({
                success: false,
                error: "الرسالة مطلوبة",
            });
        }

        // Check if user is admin
        const db = getDb();
        let isAdmin = false;
        if (db && userId) {
            try {
                const [user] = await db
                    .select()
                    .from(schema.users)
                    .where(eq(schema.users.id, userId))
                    .limit(1);
                isAdmin = user?.role === "admin";
            } catch (error) {
                console.error("Error checking user role:", error);
            }
        }

        // Find relevant products based on user message
        const relevantProducts = await findRelevantProducts(message, 5);

        // Get context from database
        let context: ChatContext = { userName };
        if (db) {
            try {
                // Get product counts
                const [productsResult] = await db
                    .select({ count: count() })
                    .from(schema.products);

                const [lowStockResult] = await db
                    .select({ count: count() })
                    .from(schema.products)
                    .where(and(gt(schema.products.stock, 0), lt(schema.products.stock, 5)));

                // Base context for all users
                context = {
                    ...context,
                    isAdmin, // Pass admin flag to AI prompt
                    productsCount: productsResult?.count ?? 0,
                    lowStockCount: lowStockResult?.count ?? 0,
                    topCategories: ["أحواض", "فلاتر", "طعام"],
                    availableProducts: relevantProducts.map(p => ({
                        id: p.id,
                        name: p.name,
                        price: p.price,
                        category: p.category,
                        rating: p.rating ? parseFloat(p.rating) : null,
                    })),
                };

                // Get sales data (last 30 days) - ONLY FOR ADMINS
                if (isAdmin) {
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                    const recentOrders = await db
                        .select()
                        .from(schema.orders)
                        .where(gt(schema.orders.createdAt, thirtyDaysAgo));

                    // Calculate total revenue
                    const totalRevenue = recentOrders.reduce((sum, order) => {
                        return sum + parseFloat(order.total);
                    }, 0);

                    // Get order counts by status
                    const completedOrders = recentOrders.filter(o => o.status === 'delivered').length;
                    const pendingOrders = recentOrders.filter(o => o.status === 'pending').length;
                    const processingOrders = recentOrders.filter(o => o.status === 'processing').length;

                    // Get top selling products
                    const orderItems = await db
                        .select()
                        .from(schema.orderItems)
                        .limit(1000);

                    const productSales = new Map<string, number>();
                    for (const item of orderItems) {
                        const current = productSales.get(item.productId) || 0;
                        productSales.set(item.productId, current + item.quantity);
                    }

                    const topProductIds = Array.from(productSales.entries())
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 5)
                        .map(([id]) => id);

                    let topProducts: any[] = [];
                    if (topProductIds.length > 0) {
                        topProducts = await db
                            .select()
                            .from(schema.products)
                            .where(inArray(schema.products.id, topProductIds))
                            .limit(5);
                    }

                    // Add sales data to context for admins only
                    context.recentOrdersCount = recentOrders.length;
                    context.salesData = {
                        totalRevenue: Math.round(totalRevenue),
                        totalOrders: recentOrders.length,
                        completedOrders,
                        pendingOrders,
                        processingOrders,
                        topProducts: topProducts.map(p => p.name),
                    };
                }
            } catch (dbError) {
                console.error("Context fetch error:", dbError);
            }
        }

        // Send to Gemini
        const response = await sendMessage(message, history, context);

        res.json({
            success: true,
            data: {
                response,
                products: relevantProducts.map(p => ({
                    id: p.id,
                    slug: p.slug, // Add slug for navigation
                    name: p.name,
                    price: p.price,
                    image: (p.images && p.images.length > 0) ? p.images[0] : p.thumbnail,
                    category: p.category,
                    rating: p.rating ? parseFloat(p.rating) : null,
                })),
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error("AI Chat Error:", error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "حدث خطأ",
        });
    }
});

// POST /api/ai/journey-recommendations
router.post("/journey-recommendations", aiRateLimiter, async (req: Request, res: Response) => {
    try {
        const { wizardData } = req.body;
        if (!wizardData) {
            return res.status(400).json({ success: false, error: "Wizard data required" });
        }

        const db = getDb();
        if (!db) throw new Error("Database not connected");

        // Fetch all products to give AI the full catalog
        // Only select necessary fields to minimize data
        const allProducts = await db
            .select({
                id: schema.products.id,
                name: schema.products.name,
                category: schema.products.category,
                price: schema.products.price,
                stock: schema.products.stock,
                thumbnail: schema.products.thumbnail, // Use thumbnail
                slug: schema.products.slug
            })
            .from(schema.products)
            .where(gt(schema.products.stock, 0));

        // Get AI recommendations
        const aiRecommendations = await recommendProductsForJourney(wizardData, allProducts);

        // Map back to full product objects with the recommendation reason
        const recommendedProducts = [];
        for (const rec of aiRecommendations) {
            // Flexible matching for ID (string or number)
            const product = allProducts.find(p => String(p.id) === String(rec.productId));
            if (product) {
                recommendedProducts.push({
                    ...product,
                    image: product.thumbnail, // Map thumbnail to image for frontend
                    reason: rec.reason // Add the AI reason
                });
            }
        }

        res.json({
            success: true,
            data: recommendedProducts
        });

    } catch (error) {
        console.error("Journey AI Error:", error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Error generating recommendations"
        });
    }
});

// GET /api/ai/health - Check if AI is working
router.get("/health", healthRateLimiter, async (_req: Request, res: Response) => {
    try {
        const response = await sendMessage("مرحبا، هل تعمل؟");
        res.json({
            success: true,
            status: "operational",
            test: response.slice(0, 100),
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            status: "error",
            error: error instanceof Error ? error.message : "AI not working",
        });
    }
});

export default router;
