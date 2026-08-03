import { randomUUID } from "node:crypto";
import { Router, type NextFunction, type Request, type Response } from "express";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "../db.js";
import { requireAccountingAdmin } from "../middleware/accounting-auth-v2.js";
import { actorFromRequest } from "../services/accountingAuditTrail.js";

const periodKeySchema = z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/);
const companySchema = z.object({
  name: z.string().trim().min(2).max(150),
  defaultFee: z.coerce.number().finite().min(0).max(1_000_000).default(5000),
  notes: z.string().trim().max(500).optional(),
  makeDefault: z.boolean().default(false),
}).strict();
const companyPatchSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  defaultFee: z.coerce.number().finite().min(0).max(1_000_000).optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  active: z.boolean().optional(),
}).strict();
const positionSchema = z.object({
  periodKey: periodKeySchema,
  positionType: z.enum(["cash", "bank", "carrier_receivable", "supplier_payable", "other_receivable"]),
  deliveryCompanyId: z.string().min(1).optional(),
  amount: z.coerce.number().finite().min(0),
  grossAmount: z.coerce.number().finite().min(0).default(0),
  feeAmount: z.coerce.number().finite().min(0).default(0),
  note: z.string().trim().min(3).max(1000),
}).strict();
const fixedItemSchema = z.object({
  name: z.string().trim().min(2).max(200),
  unitCost: z.coerce.number().finite().min(0).max(10_000_000),
  quantity: z.coerce.number().finite().positive().max(1000).default(1),
  note: z.string().trim().min(3).max(500),
}).strict();

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
function normalize(row: Row): Row {
  const numeric = new Set(["default_fee", "amount", "gross_amount", "fee_amount", "current_unit_cost", "quantity", "line_cost", "expected_cost"]);
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, numeric.has(key) ? money(value) : value]));
}
async function requireSetupSchema(): Promise<NonNullable<ReturnType<typeof getDb>>> {
  const db = getDb();
  if (!db) throw Object.assign(new Error("قاعدة البيانات غير مهيأة"), { statusCode: 503 });
  const result = await db.execute(sql`
    SELECT to_regclass('public.delivery_companies') IS NOT NULL AS companies,
           to_regclass('public.accounting_monthly_positions') IS NOT NULL AS positions,
           to_regclass('public.packaging_profiles') IS NOT NULL AS profiles
  `);
  const state = rowsOf(result)[0] as { companies?: boolean; positions?: boolean; profiles?: boolean } | undefined;
  if (!state?.companies || !state.positions || !state.profiles) {
    throw Object.assign(new Error("ACCOUNTING_V2_MIGRATION_0057_REQUIRED"), { statusCode: 503 });
  }
  return db;
}
function companyKey(name: string): string {
  const latin = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return latin || `carrier-${randomUUID().slice(0,8)}`;
}

export function createAccountingSetupV2Router() {
  const router = Router();
  router.use(requireAccountingAdmin);

  router.get("/v2/delivery-companies", async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const db = await requireSetupSchema();
      const result = await db.execute(sql`
        SELECT id,company_key,name,default_fee,active,is_default,notes,created_at,updated_at
        FROM public.delivery_companies ORDER BY is_default DESC,active DESC,name
      `);
      res.json({ items: rowsOf(result).map(normalize) });
    } catch (error) { next(error); }
  });

  router.post("/v2/delivery-companies", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = companySchema.parse(req.body);
      const db = await requireSetupSchema();
      const actor = actorFromRequest(req);
      const id = randomUUID();
      const result = await db.transaction(async (tx) => {
        if (input.makeDefault) await tx.execute(sql`UPDATE public.delivery_companies SET is_default=false,updated_at=clock_timestamp() WHERE is_default=true`);
        const inserted = await tx.execute(sql`
          INSERT INTO public.delivery_companies(id,company_key,name,default_fee,active,is_default,notes,created_by)
          VALUES(${id},${companyKey(input.name)},${input.name},${input.defaultFee},true,${input.makeDefault},${input.notes ?? null},${actor.id})
          RETURNING *
        `);
        return rowsOf(inserted)[0];
      });
      res.status(201).json(normalize(result ?? {}));
    } catch (error) { next(error); }
  });

  router.patch("/v2/delivery-companies/:id", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = companyPatchSchema.parse(req.body);
      const db = await requireSetupSchema();
      const result = await db.execute(sql`
        UPDATE public.delivery_companies SET
          name=COALESCE(${input.name ?? null},name),
          default_fee=COALESCE(${input.defaultFee ?? null},default_fee),
          notes=CASE WHEN ${input.notes !== undefined} THEN ${input.notes ?? null} ELSE notes END,
          active=COALESCE(${input.active ?? null},active),updated_at=clock_timestamp()
        WHERE id=${req.params.id} RETURNING *
      `);
      const row = rowsOf(result)[0];
      if (!row) { res.status(404).json({ message: "شركة التوصيل غير موجودة" }); return; }
      res.json(normalize(row));
    } catch (error) { next(error); }
  });

  router.post("/v2/delivery-companies/:id/default", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const db = await requireSetupSchema();
      const result = await db.transaction(async (tx) => {
        const targetResult = await tx.execute(sql`SELECT id FROM public.delivery_companies WHERE id=${req.params.id} AND active=true FOR UPDATE`);
        if (!rowsOf(targetResult)[0]) throw Object.assign(new Error("شركة التوصيل غير موجودة أو غير فعالة"), { statusCode: 404 });
        await tx.execute(sql`UPDATE public.delivery_companies SET is_default=false,updated_at=clock_timestamp() WHERE is_default=true`);
        const updated = await tx.execute(sql`UPDATE public.delivery_companies SET is_default=true,updated_at=clock_timestamp() WHERE id=${req.params.id} RETURNING *`);
        return rowsOf(updated)[0];
      });
      res.json(normalize(result ?? {}));
    } catch (error) { next(error); }
  });

  router.get("/v2/monthly-positions", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const periodKey = periodKeySchema.parse(req.query.periodKey);
      const db = await requireSetupSchema();
      const result = await db.execute(sql`
        SELECT p.*,c.name AS delivery_company_name
        FROM public.accounting_monthly_positions p
        LEFT JOIN public.delivery_companies c ON c.id=p.delivery_company_id
        WHERE p.period_key=${periodKey} AND p.status='confirmed'
        ORDER BY p.position_type,c.name
      `);
      res.json({ periodKey, items: rowsOf(result).map(normalize) });
    } catch (error) { next(error); }
  });

  router.post("/v2/monthly-positions", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = positionSchema.parse(req.body);
      const isCarrier = input.positionType === "carrier_receivable";
      if (isCarrier && !input.deliveryCompanyId) { res.status(400).json({ message: "اختر شركة التوصيل لرصيد الشركة" }); return; }
      if (!isCarrier && input.deliveryCompanyId) { res.status(400).json({ message: "شركة التوصيل تستخدم فقط مع مستحقات التوصيل" }); return; }
      if (isCarrier && Math.abs(input.amount - (input.grossAmount - input.feeAmount)) > 0.001) { res.status(400).json({ message: "الصافي يجب أن يساوي الإجمالي ناقص أجور الشركة" }); return; }
      if (!isCarrier && (input.grossAmount !== 0 || input.feeAmount !== 0)) { res.status(400).json({ message: "الإجمالي والأجور تخص رصيد شركة التوصيل فقط" }); return; }
      const db = await requireSetupSchema();
      const actor = actorFromRequest(req);
      const result = await db.transaction(async (tx) => {
        if (isCarrier) {
          const company = await tx.execute(sql`SELECT 1 FROM public.delivery_companies WHERE id=${input.deliveryCompanyId!} AND active=true FOR SHARE`);
          if (!rowsOf(company)[0]) throw Object.assign(new Error("شركة التوصيل غير موجودة أو غير فعالة"), { statusCode: 409 });
        }
        const existing = await tx.execute(sql`
          SELECT id FROM public.accounting_monthly_positions
          WHERE period_key=${input.periodKey} AND position_type=${input.positionType}
            AND delivery_company_id IS NOT DISTINCT FROM ${input.deliveryCompanyId ?? null}
            AND status='confirmed' FOR UPDATE
        `);
        const row = rowsOf(existing)[0];
        if (row) {
          const updated = await tx.execute(sql`
            UPDATE public.accounting_monthly_positions SET
              amount=${input.amount},gross_amount=${isCarrier ? input.grossAmount : 0},fee_amount=${isCarrier ? input.feeAmount : 0},
              evidence_mode='owner_confirmation',evidence_file_id=NULL,note=${input.note},
              confirmed_by=${actor.id},confirmed_at=clock_timestamp(),updated_at=clock_timestamp()
            WHERE id=${String(row.id)} RETURNING *
          `);
          return rowsOf(updated)[0];
        }
        const inserted = await tx.execute(sql`
          INSERT INTO public.accounting_monthly_positions(
            period_key,position_type,delivery_company_id,amount,gross_amount,fee_amount,currency,
            evidence_mode,note,status,confirmed_by,confirmed_at
          ) VALUES(
            ${input.periodKey},${input.positionType},${input.deliveryCompanyId ?? null},${input.amount},
            ${isCarrier ? input.grossAmount : 0},${isCarrier ? input.feeAmount : 0},'IQD',
            'owner_confirmation',${input.note},'confirmed',${actor.id},clock_timestamp()
          ) RETURNING *
        `);
        return rowsOf(inserted)[0];
      });
      res.status(201).json(normalize(result ?? {}));
    } catch (error) { next(error); }
  });

  router.get("/v2/fixed-preparation-items", async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const db = await requireSetupSchema();
      const result = await db.execute(sql`
        SELECT m.id,m.name,m.current_unit_cost,pi.quantity,
               (m.current_unit_cost*pi.quantity)::numeric AS line_cost,
               p.id AS profile_id,p.version,p.expected_cost
        FROM public.packaging_profile_families f
        JOIN public.packaging_profiles p ON p.profile_family_id=f.id AND p.active=true
        JOIN public.packaging_profile_items pi ON pi.profile_id=p.id
        JOIN public.fulfillment_materials m ON m.id=pi.material_id
        WHERE f.active=true AND COALESCE((f.applies_to->>'default')::boolean,false)=true
        ORDER BY m.name
      `);
      res.json({ items: rowsOf(result).map(normalize) });
    } catch (error) { next(error); }
  });

  router.post("/v2/fixed-preparation-items", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = fixedItemSchema.parse(req.body);
      const db = await requireSetupSchema();
      const actor = actorFromRequest(req);
      const materialId = randomUUID();
      const costRecordId = randomUUID();
      const newProfileId = randomUUID();
      const result = await db.transaction(async (tx) => {
        const profileResult = await tx.execute(sql`
          SELECT f.id AS family_id,p.*
          FROM public.packaging_profile_families f
          JOIN public.packaging_profiles p ON p.profile_family_id=f.id AND p.active=true
          WHERE f.active=true AND COALESCE((f.applies_to->>'default')::boolean,false)=true
          ORDER BY p.version DESC LIMIT 1 FOR UPDATE OF p
        `);
        const current = rowsOf(profileResult)[0];
        if (!current) throw Object.assign(new Error("بروفايل التجهيز الافتراضي غير موجود"), { statusCode: 409 });

        await tx.execute(sql`
          INSERT INTO public.fulfillment_materials(
            id,name,category,cost_component_type,unit,currency,cost_confidence,
            accounting_code,active,notes,material_kind,calculation_basis,stock_tracked
          ) VALUES(
            ${materialId},${input.name},'extra','aquavo_fulfillment_material','order','IQD',
            'owner_confirmed','5100',true,${input.note},'consumable','per_order',false
          )
        `);
        await tx.execute(sql`
          INSERT INTO public.material_cost_records(
            id,material_id,cost_basis,unit_cost,currency,approval_status,approved_by,approved_at,
            effective_date,reason,created_by
          ) VALUES(
            ${costRecordId},${materialId},'verified_manual_standard',${input.unitCost},'IQD','approved',
            ${actor.id},clock_timestamp(),clock_timestamp(),${input.note},${actor.id}
          )
        `);
        await tx.execute(sql`
          UPDATE public.fulfillment_materials SET
            current_cost_record_id=${costRecordId},current_unit_cost=${input.unitCost},updated_at=clock_timestamp()
          WHERE id=${materialId}
        `);

        const nextVersion = Number(current.version)+1;
        const oldExpected = current.expected_cost == null ? null : money(current.expected_cost);
        const nextExpected = oldExpected == null ? null : oldExpected+(input.unitCost*input.quantity);
        await tx.execute(sql`
          INSERT INTO public.packaging_profiles(
            id,name,applies_to,expected_cost,effective_date,version,active,notes,profile_family_id,
            previous_version_id,creation_reason,locked,created_by
          ) VALUES(
            ${newProfileId},${String(current.name)},${JSON.stringify(current.applies_to ?? { default: true })}::jsonb,
            ${nextExpected},clock_timestamp(),${nextVersion},true,${current.notes == null ? null : String(current.notes)},${String(current.family_id)},
            ${String(current.id)},${input.note},false,${actor.id}
          )
        `);
        await tx.execute(sql`
          INSERT INTO public.packaging_profile_items(id,profile_id,material_id,quantity)
          SELECT gen_random_uuid()::text,${newProfileId},material_id,quantity
          FROM public.packaging_profile_items WHERE profile_id=${String(current.id)}
        `);
        await tx.execute(sql`
          INSERT INTO public.packaging_profile_items(id,profile_id,material_id,quantity)
          VALUES(gen_random_uuid()::text,${newProfileId},${materialId},${input.quantity})
        `);
        await tx.execute(sql`
          UPDATE public.packaging_profiles
          SET active=false,superseded_by_id=${newProfileId},updated_at=clock_timestamp()
          WHERE id=${String(current.id)}
        `);
        return { materialId, profileId: newProfileId, version: nextVersion, expectedCost: nextExpected };
      });
      res.status(201).json(result);
    } catch (error) { next(error); }
  });

  return router;
}
