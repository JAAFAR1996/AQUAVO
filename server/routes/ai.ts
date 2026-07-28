import { Router, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { sendMessage, sendMessageStream, ChatMessage, ChatContext, recommendProductsForJourney } from "../services/gemini-ai.js";
import { getDb } from "../db.js";
import * as schema from "../../shared/schema.js";
import { count, lt, and, gt, eq, inArray } from "drizzle-orm";
import { getSession } from "../middleware/auth.js";
// Canonical order-financial definitions — the chatbot must quote the SAME money as
// the accounting page, so it never derives a revenue figure of its own.
import { orderCollectedAmount, isRealizedStatus } from "../../shared/order-financials.js";
// Canonical order-financial definitions — the chatbot must quote the SAME money as
// the accounting page, so it never derives a revenue figure of its own.
import { orderCollectedAmount, isRealizedStatus } from "../../shared/order-financials.js";

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

        // 2. Build context
        let context: ChatContext = {
            userName,
            userId,
            sessionId: (req as any).sessionID,
            isAdmin,
        };

        // Fetch user's fish patients if logged in (for personalized chatbot)
        if (db && userId && !isAdmin) {
            try {
                const fishData = await db
                    .select()
                    .from(schema.fishPatients)
                    .where(and(eq(schema.fishPatients.userId, userId), eq(schema.fishPatients.isActive, true)))
                    .limit(10);

                if (fishData.length > 0) {
                    const fishWithRecords = await Promise.all(
                        fishData.slice(0, 5).map(async (fish) => {
                            const records = await db
                                .select()
                                .from(schema.fishMedicalRecords)
                                .where(eq(schema.fishMedicalRecords.fishPatientId, fish.id))
                                .orderBy(schema.fishMedicalRecords.createdAt)
                                .limit(3);
                            return {
                                id: fish.id,
                                name: fish.name,
                                species: fish.species || undefined,
                                age: fish.age || undefined,
                                records: records.map(r => ({
                                    diagnosis: r.diagnosis || undefined,
                                    arabicDiagnosis: r.arabicDiagnosis || undefined,
                                    category: r.category || undefined,
                                    treatment: r.treatment as string[] || undefined,
                                    followUpDate: r.followUpDate?.toISOString() || undefined,
                                    followUpCompleted: r.followUpCompleted || false,
                                    outcome: r.outcome || undefined,
                                    createdAt: r.createdAt?.toISOString() || new Date().toISOString(),
                                })),
                            };
                        })
                    );
                    context.fishPatients = fishWithRecords;
                }
            } catch (fishErr) {
                console.error("Fish patients fetch error:", fishErr);
            }
        }

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

                    const todayStart = new Date();
                    todayStart.setHours(0, 0, 0, 0);

                    let todayRevenue = 0;
                    let todayOrders = 0;

                    // Revenue counts REALIZED orders only, at the amount actually
                    // collected (rounding-aware). This previously summed the raw
                    // `total` of EVERY order in the window, including cancelled ones,
                    // so the chatbot quoted a higher revenue than the accounting page.
                    const totalRevenue = recentOrders.reduce((sum, order) => {
                        if (!isRealizedStatus(order.status)) return sum;
                        const collected = orderCollectedAmount(order);
                        const orderDate = new Date(order.createdAt);

                        if (orderDate >= todayStart) {
                            todayRevenue += collected;
                            todayOrders++;
                        }

                        return sum + collected;
                    }, 0);

                    const completedOrders = recentOrders.filter(o => isRealizedStatus(o.status)).length;
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
                        todayRevenue: Math.round(todayRevenue),
                        todayOrders,
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
                cartAction: result.cartAction,
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

// POST /api/ai/chat/stream - Streaming version (SSE) — يخلي البوت يرد كلمة بكلمة
router.post("/chat/stream", aiRateLimiter, async (req: Request, res: Response) => {
    try {
        const { message, history = [], userName } = req.body as {
            message: string;
            history?: ChatMessage[];
            userName?: string;
        };

        if (!message || typeof message !== "string") {
            return res.status(400).json({ success: false, error: "الرسالة مطلوبة" });
        }

        const sess = getSession(req);
        const userId = sess?.userId;

        const db = getDb();
        let isAdmin = false;
        if (db && userId) {
            try {
                const [user] = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
                isAdmin = user?.role === "admin";
            } catch { }
        }

        let context: ChatContext = {
            userName, userId,
            sessionId: (req as any).sessionID,
            isAdmin,
        };

        // Fetch fish patients for stream endpoint too
        if (db && userId && !isAdmin) {
            try {
                const fishData = await db
                    .select()
                    .from(schema.fishPatients)
                    .where(and(eq(schema.fishPatients.userId, userId), eq(schema.fishPatients.isActive, true)))
                    .limit(5);

                if (fishData.length > 0) {
                    const fishWithRecords = await Promise.all(
                        fishData.slice(0, 3).map(async (fish) => {
                            const records = await db
                                .select()
                                .from(schema.fishMedicalRecords)
                                .where(eq(schema.fishMedicalRecords.fishPatientId, fish.id))
                                .orderBy(schema.fishMedicalRecords.createdAt)
                                .limit(2);
                            return {
                                id: fish.id,
                                name: fish.name,
                                species: fish.species || undefined,
                                age: fish.age || undefined,
                                records: records.map(r => ({
                                    diagnosis: r.diagnosis || undefined,
                                    arabicDiagnosis: r.arabicDiagnosis || undefined,
                                    category: r.category || undefined,
                                    treatment: r.treatment as string[] || undefined,
                                    followUpDate: r.followUpDate?.toISOString() || undefined,
                                    followUpCompleted: r.followUpCompleted || false,
                                    outcome: r.outcome || undefined,
                                    createdAt: r.createdAt?.toISOString() || new Date().toISOString(),
                                })),
                            };
                        })
                    );
                    context.fishPatients = fishWithRecords;
                }
            } catch { /* fish data is best-effort */ }
        }

        if (db) {
            try {
                const [productsResult] = await db.select({ count: count() }).from(schema.products);
                const [lowStockResult] = await db.select({ count: count() }).from(schema.products)
                    .where(and(gt(schema.products.stock, 0), lt(schema.products.stock, 5)));
                context.productsCount = productsResult?.count ?? 0;
                context.lowStockCount = lowStockResult?.count ?? 0;
            } catch { }
        }

        // SSE headers
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no"); // Disable Nginx buffering
        res.flushHeaders();

        // Stream events to client
        for await (const event of sendMessageStream(message, history, context)) {
            if (event.type === "done") {
                // Map products same as non-streaming endpoint
                const mappedProducts = event.products.map((p: any) => ({
                    id: p.id, slug: p.slug, name: p.name, price: p.price,
                    image: (p.images && p.images.length > 0) ? p.images[0] : p.thumbnail,
                    category: p.category,
                    rating: p.rating ? parseFloat(p.rating) : null,
                }));
                const donePayload: any = { type: "done", products: mappedProducts };
                if (event.normalizedText) donePayload.normalizedText = event.normalizedText;
                res.write(`data: ${JSON.stringify(donePayload)}\n\n`);
            } else {
                res.write(`data: ${JSON.stringify(event)}\n\n`);
            }
        }

        res.write("data: [DONE]\n\n");
        res.end();

    } catch (error) {
        console.error("Streaming Chat Error:", error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, error: "حدث خطأ" });
        } else {
            res.write(`data: ${JSON.stringify({ type: "error", message: "عذراً، صار خطأ" })}\n\n`);
            res.end();
        }
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

// POST /api/ai/feedback - Handle 👍/👎 feedback + self-learning
router.post("/feedback", aiRateLimiter, async (req: Request, res: Response) => {
    try {
        const { type, messageIndex, userMessage, aiResponse } = req.body as {
            type: "up" | "down";
            messageIndex?: number;
            userMessage?: string;
            aiResponse?: string;
        };

        if (!type || !["up", "down"].includes(type)) {
            return res.status(400).json({ success: false, error: "Invalid feedback type" });
        }

        const db = getDb();
        const sess = getSession(req);
        const userId = sess?.userId;

        if (type === "up") {
            // Positive feedback — just log it
            if (db) {
                await db.insert(schema.aiMonitoringLogs).values({
                    event: "positive_feedback",
                    level: "info",
                    userId,
                    details: { messageIndex, userMessage: userMessage?.slice(0, 200), aiResponse: aiResponse?.slice(0, 200) },
                } as any);
            }
            return res.json({ success: true });
        }

        // Negative feedback — analyze with AI and create learning
        if (!userMessage || !aiResponse) {
            return res.json({ success: true }); // Missing data, just acknowledge
        }

        // Call Groq to analyze the bad response
        const { groqClient } = await import("../services/groq-client.js");
        let analysis = { correctedBehavior: "", rule: "", severity: "medium" as string };

        if (groqClient.hasKeys()) {
            try {
                const analysisPrompt = `حلل هذا الرد السيء من بوت مبيعات احواض اسماك عراقي:

سؤال الزبون: "${userMessage.slice(0, 300)}"
رد البوت: "${aiResponse.slice(0, 500)}"

الزبون اعطى 👎 (غير راضي).

رد بـ JSON فقط بدون اي نص ثاني:
{"correctedBehavior": "شرح قصير بالعراقي شنو الخطأ", "rule": "قاعدة قصيرة بالعراقي للتجنب مستقبلاً", "severity": "low|medium|high"}`;

                const result = await groqClient.chatText(
                    [{ role: "user", content: analysisPrompt }],
                    { temperature: 0.3, maxTokens: 512 }
                );

                const jsonMatch = result.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    analysis = {
                        correctedBehavior: parsed.correctedBehavior || "",
                        rule: parsed.rule || "",
                        severity: ["low", "medium", "high"].includes(parsed.severity) ? parsed.severity : "medium",
                    };
                }
            } catch (err) {
                console.error("AI learning analysis failed:", err);
            }
        }

        // Save to ai_learnings table
        if (db) {
            await db.insert(schema.aiLearnings).values({
                type: "negative_feedback",
                userMessage: userMessage.slice(0, 1000),
                aiResponse: aiResponse.slice(0, 2000),
                correctedBehavior: analysis.correctedBehavior,
                rule: analysis.rule,
                severity: analysis.severity,
                applied: analysis.severity === "high", // Auto-apply high severity
                appliedAt: analysis.severity === "high" ? new Date() : null,
                metadata: { userId, messageIndex },
            });
        }

        return res.json({ success: true, learning: { severity: analysis.severity } });

    } catch (error) {
        console.error("Feedback Error:", error);
        res.status(500).json({ success: false, error: "Failed to process feedback" });
    }
});

// GET /api/ai/health - Check if AI is working (lightweight - no token waste)
router.get("/health", healthRateLimiter, async (_req: Request, res: Response) => {
    try {
        // Just check if Groq client has keys and is responsive
        const { groqClient } = await import("../services/groq-client.js");
        const hasKeys = groqClient.hasKeys();

        if (!hasKeys) {
            return res.status(503).json({
                success: false,
                status: "no_keys",
                error: "No Groq API keys configured",
            });
        }

        res.json({
            success: true,
            status: "operational",
            keyCount: groqClient.getKeyCount(),
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
