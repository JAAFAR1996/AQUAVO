import { Router, type NextFunction, type Request, type Response } from "express";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db.js";
import { requireAccountingAdmin } from "../middleware/accounting-auth-v2.js";
import { actorFromRequest, recordFinancialChange } from "../services/accountingAuditTrail.js";

const periodKeySchema = z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/);
const assignCompanySchema = z.object({ deliveryCompanyId: z.string().trim().min(1) }).strict();

type Row = Record<string, unknown>;
function rowsOf<T extends Row = Row>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  const rows = (result as { rows?: T[] } | null)?.rows;
  return Array.isArray(rows) ? rows : [];
}
function money(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}
function carrierKey(value: unknown): string {
  return String(value ?? "").trim().toLocaleLowerCase("ar-IQ");
}
function openOrder(row: Row, deliveryCompanyId: string | null) {
  return {
    id: String(row.id),
    orderNumber: row.order_number == null ? null : String(row.order_number),
    status: String(row.status ?? "pending"),
    customerName: row.customer_name == null ? null : String(row.customer_name),
    total: money(row.total),
    carrier: row.carrier == null ? null : String(row.carrier),
    carrierFee: money(row.carrier_fee),
    deliveryCompanyId,
    createdAt: String(row.created_at),
  };
}
function outstandingOrder(row: Row, deliveryCompanyId: string | null) {
  return {
    orderId: String(row.order_id),
    orderNumber: row.order_number == null ? null : String(row.order_number),
    recognizedAt: String(row.recognized_at),
    carrier: row.carrier == null ? null : String(row.carrier),
    grossCollected: money(row.gross_collected),
    carrierFee: money(row.carrier_fee),
    merchantNet: money(row.merchant_net),
    deliveryCompanyId,
  };
}

export function createAccountingSmartCarrierV2Router() {
  const router = Router();
  router.use(requireAccountingAdmin);

  router.get("/v2/carriers/smart", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const periodKey = periodKeySchema.parse(req.query.periodKey);
      const db = getDb();
      if (!db) {
        res.status(503).json({ message: "قاعدة البيانات غير مهيأة" });
        return;
      }

      const [companiesResult, openOrdersResult, outstandingResult, positionsResult] = await Promise.all([
        db.execute(sql`
          SELECT id,company_key,name,default_fee,active,is_default,notes
          FROM public.delivery_companies
          WHERE active=true
          ORDER BY is_default DESC,name
        `),
        db.execute(sql`
          SELECT o.id,o.order_number,o.status,o.customer_name,
                 COALESCE(o.rounded_total,o.total,0) AS total,
                 o.carrier,o.carrier_fee,o.created_at
          FROM public.orders o
          WHERE lower(COALESCE(o.status,'')) IN ('pending','confirmed','processing','shipped')
            AND COALESCE(o.is_test,false)=false
            AND COALESCE(o.financially_counted,false)=false
            AND NOT EXISTS(
              SELECT 1 FROM public.order_accounting_facts f WHERE f.order_id=o.id
            )
          ORDER BY o.created_at,o.order_number
        `),
        db.execute(sql`
          SELECT f.order_id,o.order_number,public.accounting_effective_carrier(f.id) AS carrier,f.recognized_at,
                 f.gross_collected,f.carrier_fee,f.merchant_net
          FROM public.order_accounting_facts f
          JOIN public.orders o ON o.id=f.order_id
          LEFT JOIN public.order_accounting_settlements s ON s.order_fact_id=f.id
          WHERE f.period_key=${periodKey}
            AND COALESCE(o.is_test,false)=false
            AND f.cash_custody='carrier'
            AND s.id IS NULL
          ORDER BY f.recognized_at,o.order_number
        `),
        db.execute(sql`
          SELECT p.id,p.delivery_company_id,p.amount,p.gross_amount,p.fee_amount,
                 p.other_deduction_amount,p.other_deduction_note,p.note,p.confirmed_at
          FROM public.accounting_monthly_positions p
          WHERE p.period_key=${periodKey}
            AND p.position_type='carrier_receivable'
            AND p.status='confirmed'
          ORDER BY p.confirmed_at DESC
        `),
      ]);

      const companies = rowsOf(companiesResult);
      const byName = new Map(companies.map((company) => [carrierKey(company.name), String(company.id)]));
      const companyMap = new Map<string, {
        id: string;
        companyKey: string;
        name: string;
        defaultFee: number;
        isDefault: boolean;
        notes: string | null;
        openOrders: ReturnType<typeof openOrder>[];
        outstandingOrders: ReturnType<typeof outstandingOrder>[];
        confirmedPosition: Row | null;
      }>();

      for (const company of companies) {
        companyMap.set(String(company.id), {
          id: String(company.id),
          companyKey: String(company.company_key),
          name: String(company.name),
          defaultFee: money(company.default_fee),
          isDefault: company.is_default === true,
          notes: company.notes == null ? null : String(company.notes),
          openOrders: [],
          outstandingOrders: [],
          confirmedPosition: null,
        });
      }

      const unassignedOpenOrders: ReturnType<typeof openOrder>[] = [];
      for (const row of rowsOf(openOrdersResult)) {
        const companyId = byName.get(carrierKey(row.carrier)) ?? null;
        const normalized = openOrder(row, companyId);
        if (companyId && companyMap.has(companyId)) companyMap.get(companyId)!.openOrders.push(normalized);
        else unassignedOpenOrders.push(normalized);
      }

      const unmatchedOutstandingOrders: ReturnType<typeof outstandingOrder>[] = [];
      for (const row of rowsOf(outstandingResult)) {
        const companyId = byName.get(carrierKey(row.carrier)) ?? null;
        const normalized = outstandingOrder(row, companyId);
        if (companyId && companyMap.has(companyId)) companyMap.get(companyId)!.outstandingOrders.push(normalized);
        else unmatchedOutstandingOrders.push(normalized);
      }

      for (const row of rowsOf(positionsResult)) {
        const companyId = row.delivery_company_id == null ? null : String(row.delivery_company_id);
        const company = companyId ? companyMap.get(companyId) : undefined;
        if (!company || company.confirmedPosition) continue;
        company.confirmedPosition = {
          id: String(row.id),
          amount: money(row.amount),
          grossAmount: money(row.gross_amount),
          feeAmount: money(row.fee_amount),
          otherDeductionAmount: money(row.other_deduction_amount),
          otherDeductionNote: row.other_deduction_note == null ? null : String(row.other_deduction_note),
          note: row.note == null ? null : String(row.note),
          confirmedAt: String(row.confirmed_at),
        };
      }

      const items = Array.from(companyMap.values()).map((company) => {
        const outstanding = company.outstandingOrders.reduce(
          (sum, order) => ({
            gross: sum.gross + order.grossCollected,
            fees: sum.fees + order.carrierFee,
            net: sum.net + order.merchantNet,
          }),
          { gross: 0, fees: 0, net: 0 },
        );
        return {
          ...company,
          outstanding: { count: company.outstandingOrders.length, ...outstanding },
        };
      });

      res.json({
        periodKey,
        generatedAt: new Date().toISOString(),
        items,
        unassignedOpenOrders,
        unmatchedOutstandingOrders,
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/v2/orders/:id/delivery-company", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = assignCompanySchema.parse(req.body);
      const db = getDb();
      if (!db) {
        res.status(503).json({ message: "قاعدة البيانات غير مهيأة" });
        return;
      }
      const actor = actorFromRequest(req);
      const result = await db.transaction(async (tx) => {
        const orderResult = await tx.execute(sql`
          SELECT id,order_number,status,carrier,carrier_fee,financially_counted,is_test
          FROM public.orders
          WHERE id=${req.params.id}
          FOR UPDATE
        `);
        const order = rowsOf(orderResult)[0];
        if (!order) throw Object.assign(new Error("الطلب غير موجود"), { statusCode: 404 });
        if (order.is_test === true) {
          throw Object.assign(new Error("طلب الاختبار معزول ولا يدخل بحساب أو ربط شركات التوصيل"), { statusCode: 409 });
        }
        const factCheck = await tx.execute(sql`
          SELECT 1 FROM public.order_accounting_facts WHERE order_id=${req.params.id} LIMIT 1
        `);
        if (order.financially_counted === true
          || ["delivered", "returned", "rejected_returned"].includes(String(order.status).toLowerCase())
          || rowsOf(factCheck).length > 0) {
          throw Object.assign(new Error("لا يمكن تغيير شركة التوصيل بعد تحقق البيع؛ استخدم تصحيحاً محاسبياً موثقاً"), { statusCode: 409 });
        }

        const companyResult = await tx.execute(sql`
          SELECT id,name,default_fee
          FROM public.delivery_companies
          WHERE id=${input.deliveryCompanyId} AND active=true
          FOR SHARE
        `);
        const company = rowsOf(companyResult)[0];
        if (!company) throw Object.assign(new Error("شركة التوصيل غير موجودة أو متوقفة"), { statusCode: 404 });

        const updatedResult = await tx.execute(sql`
          UPDATE public.orders
          SET carrier=${String(company.name)},carrier_fee=${money(company.default_fee)},updated_at=clock_timestamp()
          WHERE id=${req.params.id}
          RETURNING id,order_number,status,carrier,carrier_fee,updated_at
        `);
        const updated = rowsOf(updatedResult)[0];
        await recordFinancialChange(tx as never, {
          entityType: "order",
          entityId: req.params.id,
          action: "update",
          fieldName: "delivery_company",
          oldValue: { carrier: order.carrier, carrierFee: money(order.carrier_fee) },
          newValue: { carrier: company.name, carrierFee: money(company.default_fee), deliveryCompanyId: company.id },
          reason: "اختيار شركة التوصيل للطلب قبل تحقق البيع",
          performedBy: actor.id,
          performedByName: actor.name ?? undefined,
        });
        return updated;
      });
      res.json({
        ...result,
        carrier_fee: money(result?.carrier_fee),
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
