import { Router, type NextFunction, type Request, type Response } from "express";
import { sql } from "drizzle-orm";
import { requireAdmin } from "../middleware/auth.js";
import { getDb } from "../db.js";

const router = Router();
const REQUIRED_PRICE_HISTORY_COLUMNS = ["id", "product_id", "price", "stock", "sales_velocity", "demand_score", "created_at"] as const;

function rowsOf(result: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(result)) return result as Array<Record<string, unknown>>;
  const rows = (result as { rows?: unknown } | null)?.rows;
  return Array.isArray(rows) ? (rows as Array<Record<string, unknown>>) : [];
}

function insufficientDataResponse(res: Response, productsRequested: number, extra: Record<string, unknown>) {
  return res.json({
    success: true,
    data: {
      suggestions: [],
      count: 0,
      status: "insufficient_data",
      evidence: {
        productsRequested,
        eligibleProducts: 0,
        totalHistoryPoints: 0,
        minimumHistoryPoints: 5,
        ...extra,
      },
    },
  });
}

router.post("/suggestions", requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const productIds = Array.isArray(req.body?.productIds)
      ? req.body.productIds.filter((id: unknown): id is string => typeof id === "string" && id.trim().length > 0)
      : [];
    const uniqueRequested = new Set(productIds).size;

    const db = getDb();
    if (!db) return res.status(503).json({ success: false, error: "Database not connected" });

    const columnResult = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'price_history'
    `);
    const availableColumns = new Set(rowsOf(columnResult).map((row) => String(row.column_name ?? "")).filter(Boolean));
    const missingColumns = REQUIRED_PRICE_HISTORY_COLUMNS.filter((column) => !availableColumns.has(column));

    if (missingColumns.length > 0) {
      return insufficientDataResponse(res, uniqueRequested, {
        reason: "canonical_price_history_unavailable",
        message: "سجل الأسعار الحالي قديم وغير متوافق، لذلك لم يصدر النظام أي اقتراح سعري.",
        missingCanonicalFields: missingColumns,
      });
    }

    const countResult = await db.execute(sql`SELECT COUNT(*)::int AS history_points FROM price_history`);
    const historyPoints = Number(rowsOf(countResult)[0]?.history_points ?? 0);

    if (!Number.isFinite(historyPoints) || historyPoints <= 0) {
      return insufficientDataResponse(res, uniqueRequested, {
        reason: "no_verified_price_history",
        message: "لا توجد نقاط تاريخ أسعار موثقة بعد، لذلك لا يمكن الحكم على الأسعار.",
      });
    }

    next();
  } catch (error) {
    console.error("[Pricing Safety] Price-history verification failed:", error);
    return insufficientDataResponse(res, 0, {
      reason: "price_history_verification_failed",
      message: "تعذر التحقق من سجل الأسعار، ولم يعرض النظام رقماً بديلاً.",
    });
  }
});

export default router;
