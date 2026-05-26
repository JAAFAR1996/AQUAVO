import { Router, Request, Response } from "express";
import { requireAdmin } from "../middleware/auth.js";
import { pricingEngine } from "../services/pricing-engine.js";
import { getDb } from "../db.js";
import * as schema from "../../shared/schema.js";
import { eq } from "drizzle-orm";

const router = Router();

/**
 * POST /api/pricing/suggestions
 * Read-only — returns AI-based price suggestions, does NOT write to DB.
 * Admin only.
 */
router.post("/suggestions", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { productIds } = req.body as { productIds?: string[] };

    if (!productIds || !Array.isArray(productIds)) {
      return res.status(400).json({ success: false, error: "productIds array is required" });
    }

    const suggestionsMap = await pricingEngine.getBulkPriceSuggestions(productIds);
    const suggestions = [];

    for (const [productId, suggestion] of suggestionsMap.entries()) {
      const db = getDb();
      if (!db) continue;

      const [product] = await db
        .select()
        .from(schema.products)
        .where(eq(schema.products.id, productId))
        .limit(1);

      if (!product) continue;

      let reasonType: "demand_high" | "demand_low" | "stock_low" | "stock_high" | "seasonal";
      if (suggestion.reason.includes("مخزون منخفض")) reasonType = "stock_low";
      else if (suggestion.reason.includes("مخزون زائد")) reasonType = "stock_high";
      else if (suggestion.reason.includes("موسم")) reasonType = "seasonal";
      else if (suggestion.reasonType === "increase") reasonType = "demand_high";
      else if (suggestion.reasonType === "decrease") reasonType = "demand_low";
      else reasonType = "seasonal";

      suggestions.push({
        product: {
          id: product.id,
          name: product.name,
          price: parseFloat(product.price),
          category: product.category,
          image: product.image,
          thumbnail: product.thumbnail,
          stock: product.stock,
        },
        currentPrice: suggestion.currentPrice,
        suggestedPrice: suggestion.suggestedPrice,
        reason: suggestion.reason,
        reasonType,
        percentChange: suggestion.changePercent,
        confidence: suggestion.confidence,
        expectedImpact: suggestion.expectedImpact,
      });
    }

    res.json({ success: true, data: { suggestions, count: suggestions.length } });
  } catch (error) {
    console.error("[Pricing API] Error:", error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : "خطأ في حساب الاقتراحات" });
  }
});

/**
 * POST /api/pricing/apply
 * Writes products.price — REQUIRES explicit admin confirmation token.
 * AI calls are BLOCKED. No cron or automated callers.
 *
 * Required body fields:
 *   updates: Array<{ id: string; price: number }>
 *   adminConfirm: "I_CONFIRM_PRICE_CHANGE"   ← must be this exact string
 *
 * تغيير سعر البيع يحتاج موافقة صريحة من المدير.
 */
router.post("/apply", requireAdmin, async (req: Request, res: Response) => {
  try {
    // Block AI/automated callers
    const userAgent = req.headers["user-agent"] ?? "";
    const isAiAgent = req.headers["x-ai-agent"] || req.headers["x-automated"];
    if (isAiAgent) {
      console.warn("[Pricing] BLOCKED automated call to /pricing/apply from:", userAgent);
      return res.status(403).json({
        success: false,
        error: "هذا الـ endpoint لا يمكن استدعاؤه بشكل آلي أو من AI. تغيير سعر البيع يحتاج موافقة صريحة من المدير.",
      });
    }

    const { updates, adminConfirm } = req.body as {
      updates?: Array<{ id: string; price: number }>;
      adminConfirm?: string;
    };

    // Require explicit confirmation token
    if (adminConfirm !== "I_CONFIRM_PRICE_CHANGE") {
      return res.status(400).json({
        success: false,
        error: "تغيير سعر البيع يحتاج موافقة صريحة من المدير. أضف adminConfirm: 'I_CONFIRM_PRICE_CHANGE' في الطلب.",
        hint: "هذا إجراء غير قابل للتراجع. تأكد من الأرقام قبل التأكيد.",
      });
    }

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ success: false, error: "updates array is required and must not be empty" });
    }

    const db = getDb();
    if (!db) return res.status(500).json({ success: false, error: "Database not connected" });

    const adminId = (req as Request & { user?: { id: string; email?: string } }).user?.id ?? "unknown";
    const adminEmail = (req as Request & { user?: { id: string; email?: string } }).user?.email ?? "unknown";
    const now = new Date().toISOString();

    console.warn(
      `[Pricing] SALE PRICE CHANGE by admin ${adminEmail} (${adminId}) at ${now}: ` +
      updates.map(u => `${u.id}→${u.price}`).join(", ")
    );

    const results = [];
    for (const update of updates) {
      if (typeof update.price !== "number" || update.price <= 0) continue;

      const [before] = await db
        .select({ id: schema.products.id, name: schema.products.name, price: schema.products.price })
        .from(schema.products)
        .where(eq(schema.products.id, update.id))
        .limit(1);

      if (!before) continue;

      await db
        .update(schema.products)
        .set({ price: update.price.toString() })
        .where(eq(schema.products.id, update.id));

      console.warn(`[Pricing] Price changed: "${before.name}" ${before.price} → ${update.price} by ${adminEmail}`);
      results.push({ id: update.id, name: before.name, oldPrice: parseFloat(before.price), newPrice: update.price });
    }

    res.json({
      success: true,
      warning: "تم تغيير سعر البيع. هذا الإجراء غير قابل للتراجع تلقائياً.",
      data: { updated: results.length, products: results, changedBy: adminEmail, changedAt: now },
    });
  } catch (error) {
    console.error("[Pricing API] Error applying prices:", error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : "خطأ في تطبيق الأسعار" });
  }
});

/**
 * GET /api/pricing/trend/:productId
 * Read-only trend analysis. Admin only.
 */
router.get("/trend/:productId", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const { days } = req.query as { days?: string };
    const trend = await pricingEngine.analyzePriceTrend(productId, days ? parseInt(days) : 30);
    if (!trend) return res.status(404).json({ success: false, error: "لا توجد بيانات كافية لتحليل الاتجاه" });
    res.json({ success: true, data: trend });
  } catch (error) {
    console.error("[Pricing API] Error analyzing trend:", error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : "خطأ في تحليل الاتجاه" });
  }
});

export default router;
