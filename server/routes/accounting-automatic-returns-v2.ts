import { Router, type NextFunction, type Request, type Response } from "express";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db.js";
import { requireAccountingAdmin } from "../middleware/accounting-auth-v2.js";

const periodSchema = z.union([
  z.enum(["all", "day", "week", "month", "year"]),
  z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/),
]).default("all");

const returnEventStatusSchema = z.enum(["recorded", "verified", "disputed"]);

type Row = Record<string, unknown>;
function rowsOf(result: unknown): Row[] {
  if (Array.isArray(result)) return result as Row[];
  const rows = (result as { rows?: Row[] } | null)?.rows;
  return Array.isArray(rows) ? rows : [];
}
function money(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}
function asDate(value: unknown): string | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function createAccountingAutomaticReturnsV2Router() {
  const router = Router();
  router.use(requireAccountingAdmin);

  router.get("/return-events", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const period = periodSchema.parse(req.query.period ?? "all");
      const status = req.query.status == null
        ? null
        : returnEventStatusSchema.parse(req.query.status);
      const orderId = typeof req.query.orderId === "string" && req.query.orderId.trim().length > 0
        ? req.query.orderId.trim()
        : null;
      const db = getDb();
      if (!db) {
        res.status(503).json({ message: "قاعدة البيانات غير مهيأة" });
        return;
      }

      const result = await db.execute(sql`
        SELECT
          r.*,
          o.order_number,
          o.status AS order_status,
          COALESCE(SUM(pl.original_total_cost_snapshot)
            FILTER(WHERE pl.is_reclassification_only=true),0) AS packaging_classification_loss,
          COUNT(pl.id) FILTER(
            WHERE pl.is_reclassification_only=true
              AND pl.original_total_cost_snapshot IS NULL
          ) AS unknown_packaging_classifications
        FROM public.order_return_events r
        LEFT JOIN public.orders o ON o.id=r.order_id
        LEFT JOIN public.order_return_packaging_losses pl ON pl.return_event_id=r.id
        WHERE (
          ${period}='all'
          OR (${period}='day' AND r.updated_at>=clock_timestamp()-interval '1 day')
          OR (${period}='week' AND r.updated_at>=clock_timestamp()-interval '7 days')
          OR (${period}='month' AND r.updated_at>=clock_timestamp()-interval '1 month')
          OR (${period}='year' AND r.updated_at>=clock_timestamp()-interval '1 year')
          OR (${period} ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$'
              AND to_char(r.updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Baghdad','YYYY-MM')=${period})
        )
          AND (${status}::text IS NULL OR r.status=${status})
          AND (${orderId}::text IS NULL OR r.order_id=${orderId})
        GROUP BY r.id,o.order_number,o.status
        ORDER BY r.updated_at DESC,r.created_at DESC,r.id DESC
      `);

      const data = rowsOf(result).map((row) => ({
        id: String(row.id),
        orderId: String(row.order_id),
        orderNumber: row.order_number == null ? null : String(row.order_number),
        orderStatus: row.order_status == null ? null : String(row.order_status),
        type: String(row.type),
        reason: row.reason == null ? null : String(row.reason),
        refundAmount: money(row.refund_amount),
        deliveryCostLoss: money(row.delivery_cost_loss),
        returnShippingCost: money(row.return_shipping_cost),
        packagingLoss: money(row.packaging_loss),
        packagingClassificationLoss: money(row.packaging_classification_loss),
        packagingClassificationComplete: money(row.unknown_packaging_classifications) === 0,
        productWriteOffAmount: money(row.product_write_off_amount),
        cogsLoss: money(row.cogs_loss),
        restocked: row.restocked === true,
        restockedAt: asDate(row.restocked_at),
        affectedItems: row.affected_items ?? [],
        status: String(row.status),
        note: row.note == null ? null : String(row.note),
        createdAt: asDate(row.created_at) ?? String(row.created_at),
        updatedAt: asDate(row.updated_at) ?? String(row.updated_at),
      }));

      const summary = data.reduce((acc, item) => {
        acc.totalEvents += 1;
        if (item.status === "recorded") acc.recordedEvents += 1;
        if (item.status === "verified") acc.verifiedEvents += 1;
        if (item.status === "disputed") acc.disputedEvents += 1;
        if (item.status === "verified") {
          const additivePackaging = item.packagingLoss;
          acc.totalFinancialImpactVerified += item.refundAmount + item.deliveryCostLoss
            + item.returnShippingCost + additivePackaging + item.productWriteOffAmount
            + (item.restocked ? 0 : item.cogsLoss);
        }
        acc.packagingClassificationTotal += item.packagingClassificationLoss;
        return acc;
      }, {
        totalEvents: 0,
        recordedEvents: 0,
        verifiedEvents: 0,
        disputedEvents: 0,
        totalFinancialImpactVerified: 0,
        packagingClassificationTotal: 0,
      });

      res.json({
        success: true,
        period,
        data,
        summary,
        policy: {
          source: "order_status_automation",
          productStockRestoredAt: ["returned", "rejected_returned"],
          packagingClassification: "cartons_only_non_additive",
          carrierDeductions: "statement_evidence_only",
        },
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
