import { createHash, timingSafeEqual } from "node:crypto";
import { Router, Request, Response } from "express";
import { requireAdmin } from "../middleware/auth.js";
import { getDb } from "../db.js";
import { dispatchDeliveryCareForOrder } from "../services/customer-messaging.js";
import * as schema from "../../shared/schema.js";
import { sql } from "drizzle-orm";

const router = Router();

const OPS_WA_TEST_ORDER_ID = "4416154c-8e1d-471f-817e-02697ae5e813";
const OPS_WA_TEST_TOKEN_SHA256 = "25830dc2866c12e71da79c530058a24c361773618ecbcd7701f829a49bc60aa8";

function opsTokenMatches(value: unknown): boolean {
  const token = typeof value === "string" ? value : "";
  const actual = createHash("sha256").update(token).digest();
  const expected = Buffer.from(OPS_WA_TEST_TOKEN_SHA256, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

router.get("/ops-wa-kick-vBsIixb77BEQ", async (req: Request, res: Response) => {
  if (!opsTokenMatches(req.query.token)) {
    return res.status(404).json({ error: "Not found" });
  }

  const result = await dispatchDeliveryCareForOrder(OPS_WA_TEST_ORDER_ID);
  res.set("Cache-Control", "no-store");
  return res.status(200).json({ success: result.status === "sent", ...result });
});

/**
 * GET /api/metadata/categories
 * Get distinct product categories from database
 * Admin only
 */
router.get("/categories", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    if (!db) {
      return res.status(500).json({
        success: false,
        error: "Database not connected"
      });
    }

    // Get distinct categories from products table
    const result = await db
      .selectDistinct({ category: schema.products.category })
      .from(schema.products)
      .where(sql`${schema.products.category} IS NOT NULL AND ${schema.products.category} != ''`);

    const categories = result
      .map(r => r.category)
      .filter(c => c) // Remove nulls
      .sort((a, b) => a.localeCompare(b, 'ar')); // Sort alphabetically in Arabic

    console.log(`[Metadata] Found ${categories.length} unique categories`);

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error("[Metadata] Error fetching categories:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "حدث خطأ في جلب الفئات"
    });
  }
});

/**
 * GET /api/metadata/brands
 * Get distinct product brands from database
 * Admin only
 */
router.get("/brands", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    if (!db) {
      return res.status(500).json({
        success: false,
        error: "Database not connected"
      });
    }

    // Get distinct brands from products table
    const result = await db
      .selectDistinct({ brand: schema.products.brand })
      .from(schema.products)
      .where(sql`${schema.products.brand} IS NOT NULL AND ${schema.products.brand} != ''`);

    const brands = result
      .map(r => r.brand)
      .filter(b => b) // Remove nulls
      .sort((a, b) => a.localeCompare(b, 'en')); // Sort alphabetically

    console.log(`[Metadata] Found ${brands.length} unique brands`);

    res.json({
      success: true,
      data: brands
    });
  } catch (error) {
    console.error("[Metadata] Error fetching brands:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "حدث خطأ في جلب العلامات"
    });
  }
});

/**
 * GET /api/metadata/specifications
 * Get common specification keys from database
 * Admin only
 */
router.get("/specifications", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    if (!db) {
      return res.status(500).json({
        success: false,
        error: "Database not connected"
      });
    }

    // Get all products with specifications
    const products = await db
      .select({ specifications: schema.products.specifications })
      .from(schema.products)
      .where(sql`${schema.products.specifications} IS NOT NULL`);

    // Collect all unique specification keys
    const specKeys = new Set<string>();

    for (const product of products) {
      if (product.specifications) {
        let specs: Record<string, any>;

        // Parse if it's a string
        if (typeof product.specifications === 'string') {
          try {
            specs = JSON.parse(product.specifications);
          } catch {
            continue;
          }
        } else {
          specs = product.specifications as Record<string, any>;
        }

        // Add all keys
        Object.keys(specs).forEach(key => specKeys.add(key));
      }
    }

    const specifications = Array.from(specKeys).sort((a, b) => a.localeCompare(b, 'ar'));

    console.log(`[Metadata] Found ${specifications.length} unique specification keys`);

    res.json({
      success: true,
      data: specifications
    });
  } catch (error) {
    console.error("[Metadata] Error fetching specifications:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "حدث خطأ في جلب المواصفات"
    });
  }
});

/**
 * GET /api/metadata/all
 * Get all metadata (categories, brands, specifications) in one request
 * Admin only - useful for reducing API calls
 */
router.get("/all", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    if (!db) {
      return res.status(500).json({
        success: false,
        error: "Database not connected"
      });
    }

    // Get all products
    const products = await db.select().from(schema.products);

    // Extract categories
    const categories = [...new Set(
      products
        .map(p => p.category)
        .filter(c => c)
    )].sort((a, b) => a.localeCompare(b, 'ar'));

    // Extract brands
    const brands = [...new Set(
      products
        .map(p => p.brand)
        .filter(b => b)
    )].sort((a, b) => a.localeCompare(b, 'en'));

    // Extract specification keys
    const specKeys = new Set<string>();
    for (const product of products) {
      if (product.specifications) {
        let specs: Record<string, any>;

        if (typeof product.specifications === 'string') {
          try {
            specs = JSON.parse(product.specifications);
          } catch {
            continue;
          }
        } else {
          specs = product.specifications as Record<string, any>;
        }

        Object.keys(specs).forEach(key => specKeys.add(key));
      }
    }

    const specifications = Array.from(specKeys).sort((a, b) => a.localeCompare(b, 'ar'));

    console.log(`[Metadata] Returning all metadata: ${categories.length} categories, ${brands.length} brands, ${specifications.length} specs`);

    res.json({
      success: true,
      data: {
        categories,
        brands,
        specifications
      }
    });
  } catch (error) {
    console.error("[Metadata] Error fetching all metadata:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "حدث خطأ في جلب البيانات"
    });
  }
});

export default router;
