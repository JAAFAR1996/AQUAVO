import { createHash, randomUUID } from "node:crypto";
import { Router, type NextFunction, type Request, type Response } from "express";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db.js";
import { requireAccountingAdmin } from "../middleware/accounting-auth-v2.js";
import { actorFromRequest } from "../services/accountingAuditTrail.js";

const periodKeySchema = z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/);
const ACTIVE_ACCOUNTING_POLICY = "v3_explicit_rounding_carrier_snapshot";
const uploadedEvidenceSchema = z.object({
  url: z.string().url(),
  objectKey: z.string().min(1),
  storageProvider: z.string().min(1).default("cloudinary"),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  originalName: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.coerce.number().int().positive(),
}).strict().transform((value) => ({ mode: "electronic_attachment" as const, ...value }));
const ownerConfirmationSchema = z.object({
  mode: z.literal("owner_confirmation"),
  note: z.string().trim().min(5).max(1000),
}).strict();
const evidenceInputSchema = z.union([uploadedEvidenceSchema, ownerConfirmationSchema]);

const settlementSchema = z.object({
  settlementNumber: z.string().trim().min(2).max(100).optional(),
  deliveryCompanyId: z.string().min(1).optional(),
  carrier: z.string().trim().min(2).max(150).optional(),
  receivedAt: z.string().datetime({ offset: true }),
  bankReference: z.string().trim().max(150).optional(),
  notes: z.string().trim().max(500).optional(),
  orderIds: z.array(z.string().min(1)).min(1).max(200),
  evidence: evidenceInputSchema,
}).strict().refine((value) => Boolean(value.deliveryCompanyId || value.carrier), {
  message: "اختر شركة التوصيل",
  path: ["deliveryCompanyId"],
});
const recordExpenseSchema = z.object({
  category: z.enum([
    "operating", "marketing", "utilities", "office_supplies",
    "bank_fees", "shipping_cost", "other",
  ]),
  amount: z.coerce.number().positive().max(1_000_000_000_000),
  description: z.string().trim().min(3).max(500),
  expenseDate: z.string().date(),
  isRecurring: z.boolean().default(false),
  recurringPeriod: z.string().trim().min(2).max(50).optional(),
}).strict().superRefine((value, ctx) => {
  if (value.expenseDate < "2026-08-01") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["expenseDate"], message: "Accounting V2 يبدأ من 1 آب 2026" });
  }
  if (value.isRecurring && !value.recurringPeriod) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["recurringPeriod"], message: "حدد دورة المصروف المتكرر" });
  }
});
const verifyExpenseSchema = z.object({
  vendorName: z.string().trim().min(2).max(200),
  documentNumber: z.string().trim().min(1).max(100).optional(),
  documentDate: z.string().date().optional(),
  paymentMethod: z.enum(["cash", "bank", "owner_personal"]),
  businessPurpose: z.string().trim().min(5).max(500),
  taxTreatment: z.enum(["pending", "deductible", "nondeductible"]),
  reviewNote: z.string().trim().max(500).optional(),
  evidence: evidenceInputSchema,
}).strict();

type Row = Record<string, unknown>;
type EvidenceInput = z.infer<typeof evidenceInputSchema>;
type Actor = { id: string | null; name: string | null };

function rowsOf<T extends Row = Row>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  const rows = (result as { rows?: T[] } | null)?.rows;
  return Array.isArray(rows) ? rows : [];
}
function amount(value: unknown): number {
  if (value == null || value === "") throw new Error("ACCOUNTING_NUMERIC_VALUE_MISSING");
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error("ACCOUNTING_NUMERIC_VALUE_INVALID");
  return number;
}
function normalize(row: Row): Row {
  const numeric = new Set(["gross_collected", "customer_delivery_fee", "carrier_fee", "product_revenue", "rounding_adjustment", "merchant_net", "delivery_subsidy", "delivery_surplus", "amount", "gross_amount", "fee_amount", "net_amount", "fees_amount"]);
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, numeric.has(key) ? amount(value) : value]));
}
function internalEvidence(input: Extract<EvidenceInput, { mode: "owner_confirmation" }>, actor: Actor, entityType: string, entityId: string) {
  const confirmedAt = new Date().toISOString();
  const canonical = JSON.stringify({ entityType, entityId, note: input.note, confirmedBy: actor.id, confirmedAt });
  return {
    mode: input.mode,
    note: input.note,
    confirmedAt,
    confirmedBy: actor.id,
    confirmedByName: actor.name,
    storageProvider: "internal_owner_confirmation",
    objectKey: `owner-confirmation/${entityType}/${entityId}`,
    sha256: createHash("sha256").update(canonical).digest("hex"),
    originalName: "تأكيد داخلي من مالك المشروع",
    mimeType: "application/vnd.aquavo.owner-confirmation+json",
    size: Buffer.byteLength(canonical),
  };
}
function normalizedEvidence(input: EvidenceInput, actor: Actor, entityType: string, entityId: string) {
  return input.mode === "owner_confirmation" ? internalEvidence(input, actor, entityType, entityId) : input;
}
async function insertEvidenceFile(tx: any, params: {
  entityType: string;
  entityId: string;
  documentType: string;
  documentNumber: string;
  documentDate: string;
  issuer: string;
  amount: number;
  evidence: ReturnType<typeof normalizedEvidence>;
  actor: Actor;
}) {
  const metadata = JSON.stringify({
    mode: params.evidence.mode,
    url: "url" in params.evidence ? params.evidence.url : null,
    originalName: params.evidence.originalName,
    mimeType: params.evidence.mimeType,
    size: params.evidence.size,
    note: "note" in params.evidence ? params.evidence.note : null,
    confirmedAt: "confirmedAt" in params.evidence ? params.evidence.confirmedAt : null,
    confirmedByName: "confirmedByName" in params.evidence ? params.evidence.confirmedByName : null,
  });
  const result = await tx.execute(sql`
    INSERT INTO public.evidence_files(
      entity_type,entity_id,document_type,document_number,document_date,issuer,amount,currency,
      storage_provider,object_key,sha256,metadata,uploaded_by
    ) VALUES(
      ${params.entityType},${params.entityId},${params.documentType},${params.documentNumber},${params.documentDate}::date,
      ${params.issuer},${params.amount},'IQD',${params.evidence.storageProvider},
      ${params.evidence.objectKey},${params.evidence.sha256},${metadata}::jsonb,${params.actor.id}
    )
    ON CONFLICT(sha256,entity_type,entity_id) DO UPDATE SET metadata=EXCLUDED.metadata
    RETURNING id
  `);
  const row = rowsOf(result)[0];
  if (!row) throw new Error("فشل حفظ دليل العملية");
  return { id: String(row.id), metadata, evidence: params.evidence };
}
async function requireSchema(): Promise<NonNullable<ReturnType<typeof getDb>>> {
  const db = getDb();
  if (!db) throw Object.assign(new Error("قاعدة البيانات غير مهيأة"), { statusCode: 503 });
  const check = await db.execute(sql`
    SELECT to_regclass('public.order_accounting_facts') IS NOT NULL AS facts,
           to_regclass('public.evidence_files') IS NOT NULL AS evidence,
           to_regclass('public.order_accounting_carrier_corrections') IS NOT NULL AS carrier_corrections,
           to_regprocedure('public.accounting_effective_carrier(text)') IS NOT NULL AS effective_carrier
  `);
  const state = rowsOf(check)[0] as { facts?: boolean; evidence?: boolean; carrier_corrections?: boolean; effective_carrier?: boolean } | undefined;
  if (!state?.facts || !state.evidence || !state.carrier_corrections || !state.effective_carrier) {
    throw Object.assign(new Error("ACCOUNTING_V2_LATEST_MIGRATION_REQUIRED"), { statusCode: 503 });
  }
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
        SELECT f.order_id,o.order_number,public.accounting_effective_carrier(f.id) AS carrier,
               f.recognized_at,f.gross_collected,f.customer_delivery_fee,f.carrier_fee,
               f.product_revenue,f.rounding_adjustment,f.merchant_net,
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
      const actor = actorFromRequest(req) as Actor;
      const idList = sql.join(orderIds.map((id) => sql`${id}`), sql`, `);
      const result = await db.transaction(async (tx) => {
        let carrierName = input.carrier ?? null;
        if (input.deliveryCompanyId) {
          const companyResult = await tx.execute(sql`
            SELECT id,name FROM public.delivery_companies
            WHERE id=${input.deliveryCompanyId} AND active=true
            FOR SHARE
          `);
          const company = rowsOf(companyResult)[0];
          if (!company) throw Object.assign(new Error("شركة التوصيل غير موجودة أو غير فعالة"), { statusCode: 409 });
          carrierName = String(company.name);
        }
        if (!carrierName) throw Object.assign(new Error("اختر شركة التوصيل"), { statusCode: 400 });

        const factsResult = await tx.execute(sql`
          SELECT f.*,o.order_number,public.accounting_effective_carrier(f.id) AS carrier,
                 EXISTS(
                   SELECT 1 FROM public.order_accounting_settlements s
                   WHERE s.order_fact_id=f.id
                 ) AS already_settled
          FROM public.order_accounting_facts f
          JOIN public.orders o ON o.id=f.order_id
          WHERE f.order_id IN (${idList})
          FOR UPDATE OF f
        `);
        const facts = rowsOf(factsResult);
        const foundIds = new Set(facts.map((row) => String(row.order_id)));
        if (facts.length !== orderIds.length || foundIds.size !== orderIds.length
          || orderIds.some((id) => !foundIds.has(id))) {
          throw Object.assign(new Error("بعض الطلبات غير موجودة في سجل COD المحاسبي أو مكرّرة"), { statusCode: 409 });
        }
        for (const fact of facts) {
          if (fact.cash_custody !== "carrier") throw Object.assign(new Error(`الطلب ${String(fact.order_number ?? fact.order_id)} ليس بعهدة شركة التوصيل`), { statusCode: 409 });
          if (fact.carrier && String(fact.carrier) !== carrierName) throw Object.assign(new Error(`الطلب ${String(fact.order_number ?? fact.order_id)} تابع لشركة ${String(fact.carrier)}`), { statusCode: 409 });
          if (fact.already_settled === true) throw Object.assign(new Error(`الطلب ${String(fact.order_number ?? fact.order_id)} مسوّى سابقاً`), { statusCode: 409 });
        }
        const gross = facts.reduce((sum, row) => sum + amount(row.gross_collected), 0);
        const fees = facts.reduce((sum, row) => sum + amount(row.carrier_fee), 0);
        const net = facts.reduce((sum, row) => sum + amount(row.merchant_net), 0);
        if (Math.abs(net - (gross - fees)) > 0.001) throw Object.assign(new Error("هوية التسوية غير متوازنة"), { statusCode: 409 });

        const settlementId = randomUUID();
        const settlementNumber = input.settlementNumber ?? `INT-${new Date(input.receivedAt).toISOString().slice(0,10).replaceAll("-","")}-${settlementId.slice(0,8)}`;
        const documentDate = new Date(input.receivedAt).toISOString().slice(0,10);
        const evidence = normalizedEvidence(input.evidence, actor, "settlement", settlementId);
        const savedEvidence = await insertEvidenceFile(tx, {
          entityType: "settlement", entityId: settlementId, documentType: "carrier_settlement",
          documentNumber: settlementNumber, documentDate, issuer: carrierName, amount: gross,
          evidence, actor,
        });
        const evidenceJson = JSON.stringify({
          ...evidence,
          evidenceFileId: savedEvidence.id,
          policyVersion: ACTIVE_ACCOUNTING_POLICY,
        });
        const inserted = await tx.execute(sql`
          INSERT INTO public.cash_settlements(
            id,settlement_number,carrier,status,gross_amount,fees_amount,net_amount,currency,
            received_at,bank_reference,evidence,notes,created_by,created_at,updated_at
          ) VALUES(
            ${settlementId},${settlementNumber},${carrierName},'draft',${gross},${fees},${net},'IQD',
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
              ${settlementId},${String(fact.order_id)},
              ${fact.payment_event_id == null ? null : String(fact.payment_event_id)},
              ${amount(fact.gross_collected)},${amount(fact.carrier_fee)},${amount(fact.merchant_net)},
              'matched',${`سطر ${line} مطابق لحقيقة البيع`},
              ${JSON.stringify({ orderAccountingFactId: fact.id, orderNumber: fact.order_number, policyVersion: ACTIVE_ACCOUNTING_POLICY })}::jsonb
            )
          `);
        }
        const reconciled = await tx.execute(sql`
          UPDATE public.cash_settlements
          SET status='reconciled',updated_at=clock_timestamp()
          WHERE id=${settlementId}
          RETURNING *
        `);
        return rowsOf(reconciled)[0];
      });
      res.status(201).json(normalize(result ?? {}));
    } catch (error) { next(error); }
  });

  router.post("/v2/expenses", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = recordExpenseSchema.parse(req.body);
      const db = await requireSchema();
      const expenseId = randomUUID();
      const result = await db.execute(sql`
        INSERT INTO public.expenses(
          id,category,amount,description,expense_date,expense_occurred_at,
          is_recurring,recurring_period,accounting_status,tax_treatment,currency,created_at,updated_at
        ) VALUES(
          ${expenseId},${input.category},${input.amount},${input.description},${input.expenseDate}::date,
          ((${input.expenseDate}::date + time '12:00') AT TIME ZONE 'Asia/Baghdad'),
          ${input.isRecurring},${input.recurringPeriod ?? null},'recorded','pending','IQD',clock_timestamp(),clock_timestamp()
        )
        RETURNING id,category,amount,description,expense_date,accounting_status,tax_treatment
      `);
      const row = rowsOf(result)[0];
      if (!row) throw new Error("فشل تسجيل المصروف");
      res.status(201).json(normalize(row));
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
      const actor = actorFromRequest(req) as Actor;
      const result = await db.transaction(async (tx) => {
        const locked = await tx.execute(sql`SELECT * FROM public.expenses WHERE id=${req.params.id} AND deleted_at IS NULL FOR UPDATE`);
        const expense = rowsOf(locked)[0];
        if (!expense) throw Object.assign(new Error("المصروف غير موجود"), { statusCode: 404 });
        if (expense.accounting_status === "verified") return expense;
        if (expense.accounting_status === "rejected") throw Object.assign(new Error("المصروف مستبعد ولا يمكن إعادة اعتماده"), { statusCode: 409 });

        const documentDate = input.documentDate ?? String(expense.expense_date).slice(0,10);
        const documentNumber = input.documentNumber ?? `INT-EXP-${req.params.id.slice(0,8)}`;
        const evidence = normalizedEvidence(input.evidence, actor, "expense", req.params.id);
        const savedEvidence = await insertEvidenceFile(tx, {
          entityType: "expense", entityId: req.params.id, documentType: "expense_receipt",
          documentNumber, documentDate, issuer: input.vendorName, amount: amount(expense.amount),
          evidence, actor,
        });
        const metadataJson = JSON.stringify({
          ...evidence,
          evidenceFileId: savedEvidence.id,
          evidenceLevel: evidence.mode === "owner_confirmation" ? "internal_only" : "external_electronic",
        });
        const updated = await tx.execute(sql`
          UPDATE public.expenses SET
            vendor_name=${input.vendorName},document_number=${documentNumber},document_date=${documentDate}::date,
            payment_method=${input.paymentMethod},paid_from_account_code=${paidFromAccountCode},
            business_purpose=${input.businessPurpose},evidence=${metadataJson}::jsonb,evidence_hash=${evidence.sha256},
            evidence_file_id=${savedEvidence.id},accounting_status='verified',tax_treatment=${input.taxTreatment},
            reviewed_by=${actor.id},reviewed_at=clock_timestamp(),review_note=${input.reviewNote ?? null},updated_at=clock_timestamp()
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
