import { Router, type NextFunction, type Request, type Response } from "express";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db.js";
import { requireAccountingAdmin } from "../middleware/accounting-auth-v2.js";
import { actorFromRequest } from "../services/accountingAuditTrail.js";

const periodKeySchema = z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/);
const evidenceSchema = z.object({
  url: z.string().url(),
  objectKey: z.string().min(1),
  storageProvider: z.string().min(1).default("cloudinary"),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  originalName: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.coerce.number().int().positive(),
}).strict();
const settlementSchema = z.object({
  settlementNumber: z.string().trim().min(2).max(100),
  carrier: z.string().trim().min(2).max(150),
  receivedAt: z.string().datetime({ offset: true }),
  bankReference: z.string().trim().max(150).optional(),
  notes: z.string().trim().max(500).optional(),
  orderIds: z.array(z.string().min(1)).min(1).max(200),
  evidence: evidenceSchema,
}).strict();
const verifyExpenseSchema = z.object({
  vendorName: z.string().trim().min(2).max(200),
  documentNumber: z.string().trim().min(1).max(100),
  documentDate: z.string().date(),
  paymentMethod: z.enum(["cash", "bank", "owner_personal"]),
  businessPurpose: z.string().trim().min(5).max(500),
  taxTreatment: z.enum(["deductible", "nondeductible"]),
  reviewNote: z.string().trim().max(500).optional(),
  evidence: evidenceSchema,
}).strict();

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
function normalize(row: Row): Row {
  const numeric = new Set(["gross_collected", "customer_delivery_fee", "carrier_fee", "product_revenue", "merchant_net", "delivery_subsidy", "delivery_surplus", "amount", "gross_amount", "fee_amount", "net_amount", "fees_amount"]);
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, numeric.has(key) ? amount(value) : value]));
}
async function requireSchema(): Promise<NonNullable<ReturnType<typeof getDb>>> {
  const db = getDb();
  if (!db) throw Object.assign(new Error("قاعدة البيانات غير مهيأة"), { statusCode: 503 });
  const check = await db.execute(sql`
    SELECT to_regclass('public.order_accounting_facts') IS NOT NULL AS facts,
           to_regclass('public.evidence_files') IS NOT NULL AS evidence
  `);
  const state = rowsOf(check)[0] as { facts?: boolean; evidence?: boolean } | undefined;
  if (!state?.facts || !state.evidence) throw Object.assign(new Error("ACCOUNTING_V2_MIGRATION_REQUIRED"), { statusCode: 503 });
  return db;
}

export function createAccountingOperationsV2Router() {
  const router = Router();
  router.use(requireAccountingAdmin);

  router.get("/v2/settlements/candidates", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const periodKey = periodKeySchema.parse(req.query.periodKey);
      const db = await requireSchema();
      const result = await db.execute(sql`
        SELECT f.order_id,o.order_number,o.carrier,f.recognized_at,f.gross_collected,
               f.customer_delivery_fee,f.carrier_fee,f.product_revenue,f.merchant_net,
               f.delivery_subsidy,f.delivery_surplus,f.payment_event_id
        FROM public.order_accounting_facts f
        JOIN public.orders o ON o.id=f.order_id
        LEFT JOIN public.order_accounting_settlements s ON s.order_fact_id=f.id
        WHERE f.period_key=${periodKey} AND f.cash_custody='carrier' AND s.id IS NULL
        ORDER BY f.recognized_at,o.order_number
      `);
      res.json({ periodKey, items: rowsOf(result).map(normalize) });
    } catch (error) { next(error); }
  });

  router.post("/v2/settlements", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = settlementSchema.parse(req.body);
      const orderIds = [...new Set(input.orderIds)];
      if (orderIds.length !== input.orderIds.length) {
        res.status(400).json({ message: "قائمة الطلبات تحتوي تكراراً" });
        return;
      }
      const db = await requireSchema();
      const actor = actorFromRequest(req);
      const idList = sql.join(orderIds.map((id) => sql`${id}`), sql`, `);
      const result = await db.transaction(async (tx) => {
        const factsResult = await tx.execute(sql`
          SELECT f.*,o.order_number,o.carrier
          FROM public.order_accounting_facts f
          JOIN public.orders o ON o.id=f.order_id
          LEFT JOIN public.order_accounting_settlements s ON s.order_fact_id=f.id
          WHERE f.order_id IN (${idList})
          FOR UPDATE OF f
        `);
        const facts = rowsOf(factsResult);
        if (facts.length !== orderIds.length) throw Object.assign(new Error("بعض الطلبات غير موجودة في سجل COD المحاسبي"), { statusCode: 409 });
        for (const fact of facts) {
          if (fact.cash_custody !== "carrier") throw Object.assign(new Error(`الطلب ${String(fact.order_number ?? fact.order_id)} ليس بعهدة شركة التوصيل`), { statusCode: 409 });
          const existing = await tx.execute(sql`SELECT 1 FROM public.order_accounting_settlements WHERE order_fact_id=${String(fact.id)} LIMIT 1`);
          if (rowsOf(existing).length) throw Object.assign(new Error(`الطلب ${String(fact.order_number ?? fact.order_id)} مسوّى سابقاً`), { statusCode: 409 });
        }
        const gross = facts.reduce((sum, row) => sum + amount(row.gross_collected), 0);
        const fees = facts.reduce((sum, row) => sum + amount(row.carrier_fee), 0);
        const net = facts.reduce((sum, row) => sum + amount(row.merchant_net), 0);
        if (net !== gross - fees) throw Object.assign(new Error("هوية التسوية غير متوازنة"), { statusCode: 409 });

        const evidenceJson = JSON.stringify({ ...input.evidence, policyVersion: "v2_gross_includes_delivery_carrier_keeps_fee" });
        const inserted = await tx.execute(sql`
          INSERT INTO public.cash_settlements(
            settlement_number,carrier,status,gross_amount,fees_amount,net_amount,currency,
            received_at,bank_reference,evidence,notes,created_by,created_at,updated_at
          ) VALUES(
            ${input.settlementNumber},${input.carrier},'draft',${gross},${fees},${net},'IQD',
            ${input.receivedAt}::timestamptz,${input.bankReference ?? null},${evidenceJson}::jsonb,
            ${input.notes ?? null},${actor.id},clock_timestamp(),clock_timestamp()
          ) RETURNING *
        `);
        const settlement = rowsOf(inserted)[0];
        if (!settlement) throw new Error("فشل إنشاء التسوية");

        let line = 0;
        for (const fact of facts) {
          line += 1;
          await tx.execute(sql`
            INSERT INTO public.cash_settlement_items(
              settlement_id,order_id,payment_event_id,gross_amount,fee_amount,net_amount,
              reconciliation_status,notes,metadata
            ) VALUES(
              ${String(settlement.id)},${String(fact.order_id)},${String(fact.payment_event_id)},
              ${amount(fact.gross_collected)},${amount(fact.carrier_fee)},${amount(fact.merchant_net)},
              'matched',${`سطر ${line} مطابق لحقيقة البيع`},
              ${JSON.stringify({ orderAccountingFactId: fact.id, orderNumber: fact.order_number })}::jsonb
            )
          `);
        }
        const reconciled = await tx.execute(sql`
          UPDATE public.cash_settlements
          SET status='reconciled',updated_at=clock_timestamp()
          WHERE id=${String(settlement.id)}
          RETURNING *
        `);
        return rowsOf(reconciled)[0];
      });
      res.status(201).json(normalize(result ?? {}));
    } catch (error) { next(error); }
  });

  router.get("/v2/expenses/pending", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const periodKey = periodKeySchema.parse(req.query.periodKey);
      const db = await requireSchema();
      const result = await db.execute(sql`
        SELECT id,category,amount,description,expense_date,accounting_status,tax_treatment,
               vendor_name,document_number,payment_method,business_purpose
        FROM public.expenses
        WHERE deleted_at IS NULL
          AND to_char(COALESCE(expense_occurred_at,expense_date AT TIME ZONE 'Asia/Baghdad') AT TIME ZONE 'Asia/Baghdad','YYYY-MM')=${periodKey}
          AND accounting_status='recorded'
        ORDER BY expense_date,created_at
      `);
      res.json({ periodKey, items: rowsOf(result).map(normalize) });
    } catch (error) { next(error); }
  });

  router.post("/v2/expenses/:id/verify", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = verifyExpenseSchema.parse(req.body);
      const paidFromAccountCode = input.paymentMethod === "cash" ? "1000"
        : input.paymentMethod === "bank" ? "1010" : "3100";
      const db = await requireSchema();
      const actor = actorFromRequest(req);
      const result = await db.transaction(async (tx) => {
        const locked = await tx.execute(sql`SELECT * FROM public.expenses WHERE id=${req.params.id} AND deleted_at IS NULL FOR UPDATE`);
        const expense = rowsOf(locked)[0];
        if (!expense) throw Object.assign(new Error("المصروف غير موجود"), { statusCode: 404 });
        if (expense.accounting_status === "verified") return expense;
        if (expense.accounting_status === "rejected") throw Object.assign(new Error("المصروف مستبعد ولا يمكن إعادة اعتماده"), { statusCode: 409 });

        const metadataJson = JSON.stringify({ url: input.evidence.url, originalName: input.evidence.originalName, mimeType: input.evidence.mimeType, size: input.evidence.size });
        const evidenceResult = await tx.execute(sql`
          INSERT INTO public.evidence_files(
            entity_type,entity_id,document_type,document_number,document_date,issuer,amount,currency,
            storage_provider,object_key,sha256,metadata,uploaded_by
          ) VALUES(
            'expense',${req.params.id},'expense_receipt',${input.documentNumber},${input.documentDate}::date,
            ${input.vendorName},${amount(expense.amount)},'IQD',${input.evidence.storageProvider},
            ${input.evidence.objectKey},${input.evidence.sha256},${metadataJson}::jsonb,${actor.id}
          )
          ON CONFLICT(sha256,entity_type,entity_id) DO UPDATE SET metadata=EXCLUDED.metadata
          RETURNING id
        `);
        const evidence = rowsOf(evidenceResult)[0];
        if (!evidence) throw new Error("فشل ربط مستند المصروف");

        const updated = await tx.execute(sql`
          UPDATE public.expenses SET
            vendor_name=${input.vendorName},document_number=${input.documentNumber},document_date=${input.documentDate}::date,
            payment_method=${input.paymentMethod},paid_from_account_code=${paidFromAccountCode},
            business_purpose=${input.businessPurpose},evidence=${metadataJson}::jsonb,evidence_hash=${input.evidence.sha256},
            evidence_file_id=${String(evidence.id)},accounting_status='verified',tax_treatment=${input.taxTreatment},
            reviewed_by=${actor.id},review_note=${input.reviewNote ?? null},updated_at=clock_timestamp()
          WHERE id=${req.params.id}
          RETURNING *
        `);
        return rowsOf(updated)[0];
      });
      res.json(normalize(result ?? {}));
    } catch (error) { next(error); }
  });

  return router;
}
