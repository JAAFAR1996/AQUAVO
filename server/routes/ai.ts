import { Router, Request, Response } from "express";
import { sendMessage, ChatMessage, ChatContext } from "../services/gemini-ai.js";
import { getDb } from "../db.js";
import * as schema from "../../shared/schema.js";
import { count, lt, and, gt, or, ilike, desc } from "drizzle-orm";

const router = Router();

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

        // Otherwise, return popular products
        const products = await db
            .select()
            .from(schema.products)
            .orderBy(desc(schema.products.rating))
            .limit(limit);

        return products;
    } catch (error) {
        console.error("Error finding products:", error);
        return [];
    }
}

// POST /api/ai/chat - Chat with Gemini AI
router.post("/chat", async (req: Request, res: Response) => {
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

        // Find relevant products based on user message
        const relevantProducts = await findRelevantProducts(message, 5);

        // Get context from database
        let context: ChatContext = { userName };
        const db = getDb();
        if (db) {
            try {
                const [productsResult] = await db
                    .select({ count: count() })
                    .from(schema.products);

                const [lowStockResult] = await db
                    .select({ count: count() })
                    .from(schema.products)
                    .where(and(gt(schema.products.stock, 0), lt(schema.products.stock, 5)));

                context = {
                    ...context,
                    productsCount: productsResult?.count ?? 0,
                    lowStockCount: lowStockResult?.count ?? 0,
                    topCategories: ["أحواض", "فلاتر", "طعام"],
                    recentOrdersCount: 0,
                    availableProducts: relevantProducts.map(p => ({
                        id: p.id,
                        name: p.name,
                        price: p.price,
                        category: p.category,
                        rating: p.rating,
                    })),
                };
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
                    name: p.name,
                    price: p.price,
                    image: p.image,
                    category: p.category,
                    rating: p.rating,
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

// GET /api/ai/health - Check if AI is working
router.get("/health", async (_req: Request, res: Response) => {
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
