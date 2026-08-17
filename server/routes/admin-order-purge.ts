import { Router, type NextFunction, type Request, type Response } from "express";
import { sql } from "drizzle-orm";
import { requireAdmin } from "../middleware/auth.js";
import { getDb } from "../db.js";

type EligibilityRow = {
  id: string;
  order_number: string | null;
  can_purge: boolean;
};

type PurgeRow = {
  result: Record<string, unknown> | null;
};

function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  const rows = (result as { rows?: T[] } | null)?.rows;
  return Array.isArray(rows) ? rows : [];
}

function purgeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error ?? "");
}

export function createAdminOrderPurgeRouter() {
  const router = Router();

  router.get("/orders/:id/purge-eligibility", requireAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const db = getDb();
    if (!db) {
      res.status(503).json({ message: "قاعدة البيانات غير مهيأة" });
      return;
    }

    try {
      const result = await db.execute(sql`
        SELECT
          o.id,
          o.order_number,
          NOT (
            lower(btrim(COALESCE(o.status,''))) = 'delivered'
            OR o.delivered_at IS NOT NULL
            OR COALESCE(o.financially_counted,false)
            OR COALESCE(o.cod_received,false)
            OR EXISTS (SELECT 1 FROM public.order_accounting_facts f WHERE f.order_id=o.id)
            OR EXISTS (SELECT 1 FROM public.order_accounting_carrier_snapshots s WHERE s.order_id=o.id)
            OR EXISTS (SELECT 1 FROM public.payment_events pe WHERE pe.order_id=o.id)
            OR EXISTS (SELECT 1 FROM public.payments p WHERE p.order_id=o.id)
            OR EXISTS (SELECT 1 FROM public.cash_settlement_items csi WHERE csi.order_id=o.id)
            OR EXISTS (SELECT 1 FROM public.cash_flow cf WHERE cf.order_id=o.id)
            OR EXISTS (
              SELECT 1 FROM public.loyalty_transactions lt
              WHERE lt.order_id=o.id
                AND lt.status='approved'
                AND lt.type IN ('purchase_earn','rounding_earn','tier_bonus')
            )
            OR EXISTS (
              SELECT 1 FROM public.journal_entries je
              WHERE (je.source_type='order' AND je.source_id=o.id)
                 OR je.source_id IN (SELECT ore.id FROM public.order_return_events ore WHERE ore.order_id=o.id)
            )
            OR EXISTS (
              SELECT 1 FROM public.customer_credit_entries ce
              WHERE ce.source_id=o.id
                 OR ce.source_id IN (SELECT ore.id FROM public.order_return_events ore WHERE ore.order_id=o.id)
            )
          ) AS can_purge
        FROM public.orders o
        WHERE o.id=${req.params.id}
        LIMIT 1
      `);
      const row = rowsOf<EligibilityRow>(result)[0];
      if (!row) {
        res.status(404).json({ message: "الطلب غير موجود" });
        return;
      }

      res.set("Cache-Control", "no-store, private");
      res.json({
        orderId: row.id,
        orderNumber: row.order_number,
        canPurge: row.can_purge,
        reason: row.can_purge ? null : "هذا الطلب تم استلامه أو دخل بالمحاسبة، لذلك المسح النهائي محمي.",
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/orders/:id/purge", requireAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const db = getDb();
    if (!db) {
      res.status(503).json({ message: "قاعدة البيانات غير مهيأة" });
      return;
    }

    const actor = String((req as any).session?.userId || "admin");
    const reason = typeof req.body?.reason === "string" && req.body.reason.trim().length > 0
      ? req.body.reason.trim().slice(0, 500)
      : "مسح نهائي من إدارة الطلبات";

    try {
      const result = await db.execute(sql`
        SELECT public.purge_non_delivered_order(${req.params.id}, ${actor}, ${reason}) AS result
      `);
      const row = rowsOf<PurgeRow>(result)[0];
      if (!row?.result) {
        throw new Error("ORDER_PURGE_EMPTY_RESULT");
      }

      res.set("Cache-Control", "no-store, private");
      res.json(row.result);
    } catch (error) {
      const message = purgeErrorMessage(error);
      if (message.includes("ORDER_PURGE_NOT_FOUND")) {
        res.status(404).json({ message: "الطلب غير موجود أو تم مسحه مسبقاً" });
        return;
      }
      if (message.includes("ORDER_PURGE_FORBIDDEN_RECEIVED")) {
        res.status(409).json({ message: "هذا الطلب تم استلامه أو دخل بالمحاسبة، لذلك لا يمكن مسحه نهائياً." });
        return;
      }
      if (message.includes("ORDER_PURGE_LOYALTY_BALANCE_MISMATCH")) {
        res.status(409).json({ message: "توقفت عملية المسح لأن رصيد نقاط العميل لا يطابق أثر الطلب. لم يتم حذف أي شيء." });
        return;
      }
      if (message.includes("ORDER_PURGE_BLOCKED_INVENTORY_COST_HISTORY")) {
        res.status(409).json({ message: "توقفت عملية المسح لأن الطلب مرتبط بسجل كلفة مخزون محمي. لم يتم حذف أي شيء." });
        return;
      }
      if (message.toLowerCase().includes("lock timeout")) {
        res.status(409).json({ message: "الطلب قيد التحديث حالياً. حاول المسح مرة ثانية بعد ثوانٍ." });
        return;
      }
      next(error);
    }
  });

  return router;
}
