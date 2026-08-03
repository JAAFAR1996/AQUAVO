import { Router, type NextFunction, type Request, type Response } from "express";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db.js";
import { requireAccountingAdmin } from "../middleware/accounting-auth-v2.js";
import { actorFromRequest } from "../services/accountingAuditTrail.js";

const positionSchema = z.object({
  periodKey: z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/),
  positionType: z.enum(["cash", "bank", "carrier_receivable", "supplier_payable", "other_receivable"]),
  deliveryCompanyId: z.string().min(1).optional(),
  amount: z.coerce.number().finite().min(0),
  grossAmount: z.coerce.number().finite().min(0).default(0),
  feeAmount: z.coerce.number().finite().min(0).default(0),
  otherDeductionAmount: z.coerce.number().finite().min(0).default(0),
  otherDeductionNote: z.string().trim().max(1000).optional(),
  note: z.string().trim().min(3).max(1000),
}).strict();

type Row = Record<string, unknown>;
function rowsOf<T extends Row = Row>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  const rows = (result as { rows?: T[] } | null)?.rows;
  return Array.isArray(rows) ? rows : [];
}
function normalize(row: Row): Row {
  const numeric = new Set(["amount", "gross_amount", "fee_amount", "other_deduction_amount"]);
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, numeric.has(key) ? Number(value ?? 0) : value]));
}

export function createAccountingMonthlyPositionV2Router() {
  const router = Router();
  router.use(requireAccountingAdmin);

  router.post("/v2/monthly-positions", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = positionSchema.parse(req.body);
      const db = getDb();
      if (!db) {
        res.status(503).json({ message: "قاعدة البيانات غير مهيأة" });
        return;
      }
      const schemaCheck = await db.execute(sql`
        SELECT to_regclass('public.accounting_monthly_positions') IS NOT NULL AS positions,
               EXISTS(
                 SELECT 1 FROM information_schema.columns
                 WHERE table_schema='public' AND table_name='accounting_monthly_positions'
                   AND column_name='other_deduction_amount'
               ) AS deductions
      `);
      const schemaState = rowsOf(schemaCheck)[0] as { positions?: boolean; deductions?: boolean } | undefined;
      if (!schemaState?.positions || !schemaState.deductions) {
        throw Object.assign(new Error("ACCOUNTING_V2_MIGRATION_0059_REQUIRED"), { statusCode: 503 });
      }

      const isCarrier = input.positionType === "carrier_receivable";
      if (isCarrier && !input.deliveryCompanyId) {
        res.status(400).json({ message: "اختر شركة التوصيل لرصيد الشركة" });
        return;
      }
      if (!isCarrier && input.deliveryCompanyId) {
        res.status(400).json({ message: "شركة التوصيل تستخدم فقط مع مستحقات التوصيل" });
        return;
      }
      if (!isCarrier && (input.grossAmount || input.feeAmount || input.otherDeductionAmount || input.otherDeductionNote)) {
        res.status(400).json({ message: "الإجمالي والأجور والاقتطاعات الأخرى تخص رصيد شركة التوصيل فقط" });
        return;
      }
      if (isCarrier && input.otherDeductionAmount > 0 && !input.otherDeductionNote?.trim()) {
        res.status(400).json({ message: "فسّر الاقتطاع الآخر قبل حفظ الرصيد" });
        return;
      }
      const expectedNet = input.grossAmount - input.feeAmount - input.otherDeductionAmount;
      if (isCarrier && Math.abs(input.amount - expectedNet) > 0.001) {
        res.status(400).json({ message: "الصافي يجب أن يساوي الإجمالي ناقص أجور التوصيل وناقص الاقتطاعات الأخرى" });
        return;
      }

      const actor = actorFromRequest(req);
      const result = await db.transaction(async (tx) => {
        if (isCarrier) {
          const companyResult = await tx.execute(sql`
            SELECT id,name,default_fee FROM public.delivery_companies
            WHERE id=${input.deliveryCompanyId!} AND active=true
            FOR SHARE
          `);
          const company = rowsOf(companyResult)[0];
          if (!company) throw Object.assign(new Error("شركة التوصيل غير موجودة أو غير فعالة"), { statusCode: 409 });
          const defaultFee = Number(company.default_fee ?? 0);
          if (defaultFee > 0 && Math.abs(input.feeAmount % defaultFee) > 0.001) {
            throw Object.assign(new Error(
              `أجور التوصيل لازم تكون مضاعفات ${defaultFee.toLocaleString("en-US")} د.ع؛ ضع الفرق بخانة «اقتطاع آخر»`,
            ), { statusCode: 400 });
          }
        }

        const existing = await tx.execute(sql`
          SELECT id FROM public.accounting_monthly_positions
          WHERE period_key=${input.periodKey} AND position_type=${input.positionType}
            AND delivery_company_id IS NOT DISTINCT FROM ${input.deliveryCompanyId ?? null}
            AND status='confirmed'
          FOR UPDATE
        `);
        const current = rowsOf(existing)[0];
        if (current) {
          const updated = await tx.execute(sql`
            UPDATE public.accounting_monthly_positions SET
              amount=${input.amount},
              gross_amount=${isCarrier ? input.grossAmount : 0},
              fee_amount=${isCarrier ? input.feeAmount : 0},
              other_deduction_amount=${isCarrier ? input.otherDeductionAmount : 0},
              other_deduction_note=${isCarrier ? input.otherDeductionNote ?? null : null},
              evidence_mode='owner_confirmation',evidence_file_id=NULL,note=${input.note},
              confirmed_by=${actor.id},confirmed_at=clock_timestamp(),updated_at=clock_timestamp()
            WHERE id=${String(current.id)}
            RETURNING *
          `);
          return rowsOf(updated)[0];
        }
        const inserted = await tx.execute(sql`
          INSERT INTO public.accounting_monthly_positions(
            period_key,position_type,delivery_company_id,amount,gross_amount,fee_amount,
            other_deduction_amount,other_deduction_note,currency,evidence_mode,note,status,
            confirmed_by,confirmed_at
          ) VALUES(
            ${input.periodKey},${input.positionType},${input.deliveryCompanyId ?? null},${input.amount},
            ${isCarrier ? input.grossAmount : 0},${isCarrier ? input.feeAmount : 0},
            ${isCarrier ? input.otherDeductionAmount : 0},${isCarrier ? input.otherDeductionNote ?? null : null},
            'IQD','owner_confirmation',${input.note},'confirmed',${actor.id},clock_timestamp()
          ) RETURNING *
        `);
        return rowsOf(inserted)[0];
      });
      res.status(201).json(normalize(result ?? {}));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
