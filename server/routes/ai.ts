import { Router, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { sendMessage, ChatMessage, ChatContext, recommendProductsForJourney } from "../services/gemini-ai.js";
import { getDb } from "../db.js";
import * as schema from "../../shared/schema.js";
import { count, lt, and, gt, eq, inArray } from "drizzle-orm";
import { getSession } from "../middleware/auth.js";

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

// Fast local intent detection (no API call - instant)
function detectUserIntent(message: string): "INFORMATIONAL" | "SHOPPING" | "COMMERCIAL" {
    const msg = message.toLowerCase();

    // Commercial keywords
    const commercialKeywords = ["توصيل", "شحن", "سياسة", "ارجاع", "إرجاع", "عنوان", "فرع", "دفع", "فيزا", "ماستركارد", "shipping", "delivery", "policy"];
    if (commercialKeywords.some(kw => msg.includes(kw))) return "COMMERCIAL";

    // Shopping keywords
    const shoppingKeywords = [
        "شراء", "اشتري", "أشتري", "ابي", "أبي", "أريد", "اريد", "سعر", "كم سعر",
        "أكو", "اكو", "عدكم", "عندكم", "متوفر", "موجود", "مخزون", "حوض", "فلتر",
        "سخان", "مضخة", "طعام", "غذاء", "ديكور", "إضاءة", "led", "نبات",
        "سمك", "أسماك", "معالج", "دواء", "حصى", "رمل", "buy", "price", "stock",
        "محتاج", "لوازم", "مستلزمات", "أدوات", "كوبون", "خصم", "عرض",
        "السلة", "سلة", "cart", "أضف", "اضف", "order", "طلب"
    ];
    if (shoppingKeywords.some(kw => msg.includes(kw))) return "SHOPPING";

    return "INFORMATIONAL";
}

// POST /api/ai/chat - Chat with Gemini AI
router.post("/chat", aiRateLimiter, async (req: Request, res: Response) => {
    try {
        const { message, history = [], userName } = req.body as {
            message: string;
            history?: ChatMessage[];
            userName?: string;
        };

        if (!message || typeof message !== "string") {
            return res.status(400).json({
                success: false,
                error: "الرسالة مطلوبة",
            });
        }

        // Get userId from session (NOT from request body) to prevent auth bypass
        const sess = getSession(req);
        const userId = sess?.userId;

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

        // 1. Detect Intent (instant, no API call)
        const intent = detectUserIntent(message);
        console.log(`🤖 User Intent: ${intent} for message: "${message}"`);

        // 2. Build context - AI tools handle product search now (search_products, get_deals)
        let context: ChatContext = {
            userName,
            userId,
            sessionId: (req as any).sessionID,
            isAdmin,
        };

        if (db) {
            try {
                // Get product counts for context
                const [productsResult] = await db
                    .select({ count: count() })
                    .from(schema.products);

                const [lowStockResult] = await db
                    .select({ count: count() })
                    .from(schema.products)
                    .where(and(gt(schema.products.stock, 0), lt(schema.products.stock, 5)));

                context.productsCount = productsResult?.count ?? 0;
                context.lowStockCount = lowStockResult?.count ?? 0;

                // Get sales data (last 30 days) - ONLY FOR ADMINS
                if (isAdmin) {
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                    const recentOrders = await db
                        .select()
                        .from(schema.orders)
                        .where(gt(schema.orders.createdAt, thirtyDaysAgo));

                    const totalRevenue = recentOrders.reduce((sum, order) => {
                        return sum + (parseFloat(order.total) || 0);
                    }, 0);

                    const completedOrders = recentOrders.filter(o => o.status === 'delivered').length;
                    const pendingOrders = recentOrders.filter(o => o.status === 'pending').length;
                    const processingOrders = recentOrders.filter(o => o.status === 'processing').length;

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

        // 3. Send to AI with tool calling (AI uses search_products, get_deals, etc.)
        const result = await sendMessage(message, history, context);
        const allProducts = result.products || [];

        res.json({
            success: true,
            data: {
                response: result.text,
                products: allProducts.map(p => ({
                    id: p.id,
                    slug: p.slug,
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
        const result = await sendMessage("مرحبا، هل تعمل؟");
        res.json({
            success: true,
            status: "operational",
            test: result.text.slice(0, 100),
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
