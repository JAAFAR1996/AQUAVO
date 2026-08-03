import { Router, type NextFunction, type Request, type Response } from "express";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db.js";
import { requireAccountingAdmin } from "../middleware/accounting-auth-v2.js";
import { actorFromRequest, recordFinancialChange } from "../services/accountingAuditTrail.js";

const correctionSchema = z.object({
  deliveryCompanyId: z.string().min(1),
  orderIds: z.array(z.string().min(1)).min(1).max(200),
}).passthrough();

type Row = Record<string, unknown>;
function rowsOf<T extends Row = Row>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  const rows = (result as { rows?: T[] } | null)?.rows;
  return Array.isArray(rows) ? rows : [];
}
function amount(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

/**
 * Corrects only the delivery-company identity before the canonical settlement
 * route runs. The monetary snapshot is immutable: a correction is allowed only
 * when the selected company's configured fee equals the order fact's carrier fee.
 */
export function createAccountingCarrierCorrectionV2Router() {
  const router = Router();
  router.use(requireAccountingAdmin);

  router.post("/v2/settlements", async (req: Request, res: Response, next: NextFunction) => {
    const parsed = correctionSchema.safeParse(req.body);
    if (!parsed.success) {
      next();
      return;
    }
    const db = getDb();
    if (!db) {
      res.status(503).json({ message: "قاعدة البيانات غير مهيأة" });
      return;
    }
    const actor = actorFromRequest(req);
    const orderIds = [...new Set(parsed.data.orderIds)];
    const idList = sql.join(orderIds.map((id) => sql`${id}`), sql`, `);

    try {
      await db.transaction(async (tx) => {
        const companyResult = await tx.execute(sql`
          SELECT id,name,default_fee
          FROM public.delivery_companies
          WHERE id=${parsed.data.deliveryCompanyId} AND active=true
          FOR SHARE
        `);
        const company = rowsOf(companyResult)[0];
        if (!company) throw Object.assign(new Error("شركة التوصيل غير موجودة أو غير فعالة"), { statusCode: 409 });

        const factsResult = await tx.execute(sql`
          SELECT f.order_id,f.carrier_fee,o.order_number,o.carrier
          FROM public.order_accounting_facts f
          JOIN public.orders o ON o.id=f.order_id
          LEFT JOIN public.order_accounting_settlements s ON s.order_fact_id=f.id
          WHERE f.order_id IN (${idList}) AND s.id IS NULL
          FOR UPDATE OF o
        `);
        const facts = rowsOf(factsResult);
        if (facts.length !== orderIds.length) {
          throw Object.assign(new Error("بعض الطلبات غير موجودة أو مسوّاة سابقاً"), { statusCode: 409 });
        }

        for (const fact of facts) {
          const oldCarrier = fact.carrier == null ? null : String(fact.carrier);
          const newCarrier = String(company.name);
          if (oldCarrier === newCarrier) continue;
          if (Math.abs(amount(fact.carrier_fee) - amount(company.default_fee)) > 0.001) {
            throw Object.assign(new Error(
              `لا يمكن تغيير شركة الطلب ${String(fact.order_number ?? fact.order_id)} لأن أجرتها تختلف عن الأجرة المثبتة وقت التسليم`,
            ), { statusCode: 409 });
          }
          await tx.execute(sql`
            UPDATE public.orders SET carrier=${newCarrier},updated_at=clock_timestamp()
            WHERE id=${String(fact.order_id)}
          `);
          await recordFinancialChange(tx as never, {
            entityType: "order",
            entityId: String(fact.order_id),
            action: "update",
            fieldName: "carrier",
            oldValue: oldCarrier,
            newValue: newCarrier,
            reason: "تصحيح هوية شركة التوصيل عند المطابقة؛ الأجرة المالية لم تتغير",
            performedBy: actor.id,
            performedByName: actor.name ?? undefined,
          });
        }
      });
      next();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
