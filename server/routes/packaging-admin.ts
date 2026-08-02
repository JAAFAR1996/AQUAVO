// ─────────────────────────────────────────────────────────────────────────────
// Admin API for the carton planner: catalogue, stock, packing data, plans,
// reservations, alerts and return classification.
//
// Same hard rule as fulfillment-admin.ts: NO financial or geometric arithmetic
// lives here. Every number comes from a canonical service —
//   carton-planner.ts                → the plan and its Arabic explanation
//   carton-safety-validator.ts       → the seven safety checks
//   carton-reservation-service.ts    → stock, reservations, availability
//   admin-alert-service.ts           → alert state
//   return-packaging-loss-service.ts → return classification
//   packing-import-service.ts        → spreadsheet parsing and matching
// A handler authenticates, validates, delegates, audits and serialises.
//
// THERE IS NO SAFETY-BYPASS ENDPOINT. A plan that fails validation cannot be
// stored as validated, cannot reserve stock and cannot be confirmed. The only
// escape is `manual_pack_required`, which is explicitly not a validated plan and
// releases any hold the order had.
// ─────────────────────────────────────────────────────────────────────────────
import { Router, type Request, type Response, type NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { requireAdmin } from "../middleware/auth.js";
import { getDb } from "../db.js";
import {
  fulfillmentMaterials,
  orderFulfillmentEvents,
  orderFulfillmentLines,
  packagingInventoryMovements,
  products,
} from "../../shared/schema.js";
import {
  adminStockAlerts,
  cartonReservations,
  orderPackingPlanItems,
  orderPackingPlans,
  orderReturnPackagingLosses,
  packingImportDraftLines,
  packingImportDrafts,
  productPackingData,
} from "../../shared/packing-schema.js";
import { toMoneyOrNull } from "../../shared/order-financials.js";
import { recordFinancialChange, actorFromRequest } from "../services/accountingAuditTrail.js";
import type { FulfillmentDb } from "../services/fulfillment-db.js";
import {
  CartonStockError,
  changeReservedCarton,
  getCartonStock,
  releaseOrderReservations,
  reserveCartons,
} from "../services/carton-reservation-service.js";
import { evaluateStockAlert } from "../services/admin-alert-service.js";
import { planOrder } from "../services/carton-planner.js";
import { validatePlanSafety } from "../services/carton-safety-validator.js";
import { syncPlanCartonsToDraft } from "../services/plan-carton-costing.js";
import {
  DEFAULT_PACKING_POLICY,
  cmToMm,
  kgToG,
  type CartonSpec,
  type PackingItemSpec,
  type PackingPolicy,
} from "../../shared/packing-types.js";
import {
  ReturnClassificationError,
  buildClassifiedQuantities,
  classifyAdminRecordedDamage,
  classifyFullReturn,
  type ConsumedLine,
} from "../services/return-packaging-loss-service.js";
import {
  parseImportSheet,
  selectApplicableRows,
  summariseImport,
  type RawSheetRow,
} from "../services/packing-import-service.js";
import { summarisePackingCompleteness } from "../services/packing-data-summary.js";

const router = Router();

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "طلبات كثيرة — انتظر دقيقة وحاول مرة ثانية" },
});
const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(requireAdmin);

function db(): FulfillmentDb {
  const d = getDb() as FulfillmentDb | null;
  if (!d) throw new Error("Database not available");
  return d;
}

function auditLog(event: string, fields: Record<string, string | number | null | undefined>): void {
  const safe = Object.entries(fields)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${v ?? "null"}`)
    .join(" ");
  console.log(`[packaging] ${event} ${safe}`);
}

const DOMAIN_ERROR_STATUS: Array<[RegExp, number]> = [
  [/NOT_FOUND/, 404],
  [/ALREADY_CLASSIFIED|ALREADY_EXISTS|PLAN_LOCKED|BOX_COST_LOCKED/, 409],
  [
    /INSUFFICIENT_CARTON_STOCK|EXCEEDS_REMAINING|QUANTITY_EXCEEDS_CONSUMED|LINE_NOT_CONSUMED|REASON_REQUIRED|QUANTITY_NOT_POSITIVE|_REQUIRED|_INVALID|VALIDATION_FAILED/,
    400,
  ],
];

function wrap(handler: (req: Request, res: Response) => Promise<void>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await handler(req, res);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const code =
        err instanceof CartonStockError || err instanceof ReturnClassificationError
          ? err.code
          : message.split(":")[0];
      const match = DOMAIN_ERROR_STATUS.find(([re]) => re.test(code) || re.test(message));
      if (match) {
        auditLog("rejected", { code, status: match[1] });
        res.status(match[1]).json({ error: message, code });
        return;
      }
      next(err);
    }
  };
}

const idSchema = z.string().min(1).max(128);
const reasonSchema = z.string().trim().min(3).max(500);
const idempotencySchema = z.string().min(4).max(200);
const dimensionSchema = z.number().finite().positive().max(1000);
const ratioSchema = z.number().finite().min(0).max(1);

/** Read the support policy from settings, falling back to the built-in defaults. */
async function loadPolicy(): Promise<PackingPolicy> {
  const rows = await db().execute(
    sql`SELECT key, value FROM settings WHERE key LIKE 'packing_%'`,
  );
  const list = Array.isArray(rows) ? rows : ((rows as { rows?: unknown[] }).rows ?? []);
  const map = new Map(
    (list as { key: string; value: string }[]).map((r) => [r.key, Number(r.value)]),
  );
  const bp = (v: number | undefined, fallback: number) =>
    Number.isFinite(v) ? Math.round((v as number) * 10_000) : fallback;
  return {
    minSupportRatioBp: bp(map.get("packing_min_support_ratio"), DEFAULT_PACKING_POLICY.minSupportRatioBp),
    maxOverhangRatioBp: bp(map.get("packing_max_overhang_ratio"), DEFAULT_PACKING_POLICY.maxOverhangRatioBp),
    fragileMinSupportRatioBp: bp(
      map.get("packing_fragile_min_support_ratio"),
      DEFAULT_PACKING_POLICY.fragileMinSupportRatioBp,
    ),
    contactEpsilonMm: Number.isFinite(map.get("packing_contact_epsilon_mm"))
      ? (map.get("packing_contact_epsilon_mm") as number)
      : DEFAULT_PACKING_POLICY.contactEpsilonMm,
    minContactAreaMm2: Number.isFinite(map.get("packing_min_contact_area_mm2"))
      ? (map.get("packing_min_contact_area_mm2") as number)
      : DEFAULT_PACKING_POLICY.minContactAreaMm2,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// PREPARATION COSTS  ·  المحاسب ← تكاليف تجهيز الطلب
// ═════════════════════════════════════════════════════════════════════════════

router.get(
  "/preparation-costs",
  readLimiter,
  wrap(async (_req, res) => {
    const rows = await db()
      .select()
      .from(fulfillmentMaterials)
      .where(eq(fulfillmentMaterials.materialKind, "consumable"));
    res.json({
      items: rows
        .map((m) => ({
          id: m.id,
          name: m.name,
          sku: m.sku,
          calculationBasis: m.calculationBasis,
          unitCost: toMoneyOrNull(m.currentUnitCost),
          currency: m.currency,
          active: m.active,
          archivedAt: m.archivedAt,
          stockTracked: m.stockTracked,
          notes: m.notes,
        }))
        .sort((a, b) => (a.sku ?? a.name).localeCompare(b.sku ?? b.name)),
    });
  }),
);

const preparationCostSchema = z.object({
  name: z.string().trim().min(2).max(200),
  sku: z.string().trim().min(2).max(64).optional(),
  calculationBasis: z.enum(["per_order", "per_carton", "per_product_unit"]),
  notes: z.string().trim().max(500).optional(),
  idempotencyKey: idempotencySchema,
});

router.post(
  "/preparation-costs",
  writeLimiter,
  wrap(async (req, res) => {
    const parsed = preparationCostSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: "VALIDATION_INVALID", details: parsed.error.flatten() });
      return;
    }
    const id = randomUUID();
    await db().insert(fulfillmentMaterials).values({
      id,
      name: parsed.data.name,
      sku: parsed.data.sku ?? null,
      materialKind: "consumable",
      calculationBasis: parsed.data.calculationBasis,
      // A preparation cost is an accounting figure, not inventory. Cost itself is
      // set through material_cost_records so the approval trail exists.
      stockTracked: false,
      unit: "order",
      currency: "IQD",
      active: true,
      notes: parsed.data.notes ?? null,
    });
    await recordFinancialChange({
      entityType: "fulfillment_material",
      entityId: id,
      fieldName: "created",
      oldValue: null,
      newValue: parsed.data.name,
      reason: `إضافة كلفة تجهيز (${parsed.data.calculationBasis})`,
      actor: actorFromRequest(req),
    });
    auditLog("preparation-cost.create", { id, basis: parsed.data.calculationBasis });
    res.status(201).json({ id });
  }),
);

const preparationCostPatchSchema = z.object({
  name: z.string().trim().min(2).max(200).optional(),
  calculationBasis: z.enum(["per_order", "per_carton", "per_product_unit"]).optional(),
  active: z.boolean().optional(),
  notes: z.string().trim().max(500).optional(),
  reason: reasonSchema,
});

router.patch(
  "/preparation-costs/:id",
  writeLimiter,
  wrap(async (req, res) => {
    const parsed = preparationCostPatchSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: "VALIDATION_INVALID", details: parsed.error.flatten() });
      return;
    }
    const id = idSchema.parse(req.params.id);
    const [existing] = await db()
      .select()
      .from(fulfillmentMaterials)
      .where(eq(fulfillmentMaterials.id, id))
      .limit(1);
    if (!existing) {
      res.status(404).json({ error: "MATERIAL_NOT_FOUND" });
      return;
    }
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.name !== undefined) patch.name = parsed.data.name;
    if (parsed.data.calculationBasis !== undefined) patch.calculationBasis = parsed.data.calculationBasis;
    if (parsed.data.active !== undefined) patch.active = parsed.data.active;
    if (parsed.data.notes !== undefined) patch.notes = parsed.data.notes;

    await db().update(fulfillmentMaterials).set(patch).where(eq(fulfillmentMaterials.id, id));
    await recordFinancialChange({
      entityType: "fulfillment_material",
      entityId: id,
      fieldName: "updated",
      oldValue: existing.name,
      newValue: parsed.data.name ?? existing.name,
      reason: parsed.data.reason,
      actor: actorFromRequest(req),
    });
    auditLog("preparation-cost.update", { id });
    res.json({ ok: true });
  }),
);

router.post(
  "/preparation-costs/:id/archive",
  writeLimiter,
  wrap(async (req, res) => {
    const id = idSchema.parse(req.params.id);
    const reason = reasonSchema.parse((req.body ?? {}).reason);
    // Soft archive only. A material referenced by any historical fulfillment line
    // must stay readable forever, so nothing is ever hard-deleted here.
    await db()
      .update(fulfillmentMaterials)
      .set({ archivedAt: new Date(), active: false, updatedAt: new Date() })
      .where(eq(fulfillmentMaterials.id, id));
    await recordFinancialChange({
      entityType: "fulfillment_material",
      entityId: id,
      fieldName: "archived",
      oldValue: "active",
      newValue: "archived",
      reason,
      actor: actorFromRequest(req),
    });
    auditLog("preparation-cost.archive", { id });
    res.json({ ok: true });
  }),
);

// ═════════════════════════════════════════════════════════════════════════════
// CARTONS  ·  المحاسب ← الكراتين ومواد التغليف
// ═════════════════════════════════════════════════════════════════════════════

async function cartonRows() {
  return db()
    .select()
    .from(fulfillmentMaterials)
    .where(and(eq(fulfillmentMaterials.materialKind, "carton"), isNull(fulfillmentMaterials.archivedAt)));
}

router.get(
  "/cartons",
  readLimiter,
  wrap(async (_req, res) => {
    const rows = await cartonRows();
    const items = [];
    for (const c of rows) {
      const stock = await getCartonStock(db(), c.id);
      items.push({
        id: c.id,
        name: c.name,
        sku: c.sku,
        internalLengthCm: toMoneyOrNull(c.internalLengthCm),
        internalWidthCm: toMoneyOrNull(c.internalWidthCm),
        internalHeightCm: toMoneyOrNull(c.internalHeightCm),
        maxWeightKg: toMoneyOrNull(c.maxWeightKg),
        safetyPaddingCm: toMoneyOrNull(c.safetyPaddingCm),
        unitCost: toMoneyOrNull(c.currentUnitCost),
        // Derived, never stored — there is no counter that can drift.
        onHand: stock.onHand,
        reserved: stock.reserved,
        available: stock.available,
        lowStockThreshold: toMoneyOrNull(c.lowStockThreshold),
        active: c.active,
        notes: c.notes,
      });
    }
    res.json({ items: items.sort((a, b) => (a.sku ?? "").localeCompare(b.sku ?? "")) });
  }),
);

const cartonSchema = z.object({
  name: z.string().trim().min(2).max(200),
  sku: z.string().trim().min(2).max(64),
  internalLengthCm: dimensionSchema,
  internalWidthCm: dimensionSchema,
  internalHeightCm: dimensionSchema,
  externalLengthCm: dimensionSchema.optional(),
  externalWidthCm: dimensionSchema.optional(),
  externalHeightCm: dimensionSchema.optional(),
  maxWeightKg: z.number().finite().positive().max(500),
  safetyPaddingCm: z.number().finite().min(0).max(20).optional(),
  lowStockThreshold: z.number().finite().min(0).max(100_000).optional(),
  notes: z.string().trim().max(500).optional(),
  idempotencyKey: idempotencySchema,
});

router.post(
  "/cartons",
  writeLimiter,
  wrap(async (req, res) => {
    const parsed = cartonSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: "VALIDATION_INVALID", details: parsed.error.flatten() });
      return;
    }
    const d = parsed.data;
    const id = randomUUID();
    await db().insert(fulfillmentMaterials).values({
      id,
      name: d.name,
      sku: d.sku,
      category: "box",
      materialKind: "carton",
      calculationBasis: "per_carton",
      stockTracked: true,
      unit: "piece",
      currency: "IQD",
      active: true,
      internalLengthCm: String(d.internalLengthCm),
      internalWidthCm: String(d.internalWidthCm),
      internalHeightCm: String(d.internalHeightCm),
      externalLengthCm: d.externalLengthCm != null ? String(d.externalLengthCm) : null,
      externalWidthCm: d.externalWidthCm != null ? String(d.externalWidthCm) : null,
      externalHeightCm: d.externalHeightCm != null ? String(d.externalHeightCm) : null,
      maxWeightKg: String(d.maxWeightKg),
      safetyPaddingCm: d.safetyPaddingCm != null ? String(d.safetyPaddingCm) : null,
      lowStockThreshold: d.lowStockThreshold != null ? String(d.lowStockThreshold) : null,
      notes: d.notes ?? null,
      // Cost is deliberately NOT set here. It goes through material_cost_records
      // so an unpriced carton stays honestly unpriced rather than silently zero.
    });
    auditLog("carton.create", { id, sku: d.sku });
    res.status(201).json({ id });
  }),
);

// `active` is patch-only: a carton is created active, and deactivating it is how
// the owner retires a size without deleting a row that historical plans and
// consumed movements still reference.
const cartonPatchSchema = cartonSchema.partial().extend({
  active: z.boolean().optional(),
  reason: reasonSchema,
});

router.patch(
  "/cartons/:id",
  writeLimiter,
  wrap(async (req, res) => {
    const parsed = cartonPatchSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: "VALIDATION_INVALID", details: parsed.error.flatten() });
      return;
    }
    const id = idSchema.parse(req.params.id);
    const d = parsed.data;
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    for (const k of [
      "internalLengthCm", "internalWidthCm", "internalHeightCm",
      "externalLengthCm", "externalWidthCm", "externalHeightCm",
      "maxWeightKg", "safetyPaddingCm", "lowStockThreshold",
    ] as const) {
      if (d[k] !== undefined) patch[k] = String(d[k]);
    }
    if (d.name !== undefined) patch.name = d.name;
    if (d.notes !== undefined) patch.notes = d.notes;
    if (d.active !== undefined) patch.active = d.active;

    await db().update(fulfillmentMaterials).set(patch).where(eq(fulfillmentMaterials.id, id));
    await recordFinancialChange({
      entityType: "fulfillment_material",
      entityId: id,
      fieldName: "carton_updated",
      oldValue: null,
      newValue: JSON.stringify(patch),
      reason: d.reason,
      actor: actorFromRequest(req),
    });
    auditLog("carton.update", { id });
    res.json({ ok: true });
  }),
);

const receiptSchema = z.object({
  quantity: z.number().finite().positive().max(1_000_000),
  reason: reasonSchema,
  idempotencyKey: idempotencySchema,
});

router.post(
  "/cartons/:id/receive",
  writeLimiter,
  wrap(async (req, res) => {
    const parsed = receiptSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: "VALIDATION_INVALID", details: parsed.error.flatten() });
      return;
    }
    const id = idSchema.parse(req.params.id);
    // A receipt IS a real physical quantity change, so it belongs in the ledger.
    await db().insert(packagingInventoryMovements).values({
      id: randomUUID(),
      materialId: id,
      movementType: "purchase_receipt",
      quantity: String(parsed.data.quantity),
      idempotencyKey: `receipt:${id}:${parsed.data.idempotencyKey}`,
      sourceDocument: parsed.data.reason,
      recordedBy: actorFromRequest(req),
    });
    await afterStockChange(id);
    auditLog("carton.receive", { id, qty: parsed.data.quantity });
    res.status(201).json({ ok: true });
  }),
);

const correctionSchema = z.object({
  quantity: z.number().finite().max(1_000_000),
  reason: reasonSchema,
  idempotencyKey: idempotencySchema,
});

router.post(
  "/cartons/:id/correct",
  writeLimiter,
  wrap(async (req, res) => {
    const parsed = correctionSchema.safeParse(req.body ?? {});
    if (!parsed.success || parsed.data.quantity === 0) {
      res.status(400).json({ error: "VALIDATION_INVALID" });
      return;
    }
    const id = idSchema.parse(req.params.id);
    // `correction` is the only movement type that may go either way, and it
    // always carries a stated reason.
    await db().insert(packagingInventoryMovements).values({
      id: randomUUID(),
      materialId: id,
      movementType: "correction",
      quantity: String(parsed.data.quantity),
      idempotencyKey: `correct:${id}:${parsed.data.idempotencyKey}`,
      sourceDocument: parsed.data.reason,
      recordedBy: actorFromRequest(req),
    });
    await recordFinancialChange({
      entityType: "packaging_inventory",
      entityId: id,
      fieldName: "manual_correction",
      oldValue: null,
      newValue: String(parsed.data.quantity),
      reason: parsed.data.reason,
      actor: actorFromRequest(req),
    });
    await afterStockChange(id);
    auditLog("carton.correct", { id, qty: parsed.data.quantity });
    res.status(201).json({ ok: true });
  }),
);

router.get(
  "/cartons/:id/stock",
  readLimiter,
  wrap(async (req, res) => {
    const id = idSchema.parse(req.params.id);
    const stock = await getCartonStock(db(), id);
    const movements = await db()
      .select()
      .from(packagingInventoryMovements)
      .where(eq(packagingInventoryMovements.materialId, id))
      .orderBy(desc(packagingInventoryMovements.createdAt))
      .limit(200);
    const reservations = await db()
      .select()
      .from(cartonReservations)
      .where(eq(cartonReservations.materialId, id))
      .orderBy(desc(cartonReservations.reservedAt))
      .limit(200);
    res.json({ stock, movements, reservations });
  }),
);

/** Re-evaluate the alert whenever stock could have moved. Idempotent. */
async function afterStockChange(materialId: string): Promise<void> {
  const [m] = await db()
    .select()
    .from(fulfillmentMaterials)
    .where(eq(fulfillmentMaterials.id, materialId))
    .limit(1);
  if (!m) return;
  await evaluateStockAlert(db(), {
    materialId: m.id,
    name: m.name,
    lowStockThreshold: toMoneyOrNull(m.lowStockThreshold),
    internalLengthCm: toMoneyOrNull(m.internalLengthCm),
    internalWidthCm: toMoneyOrNull(m.internalWidthCm),
    internalHeightCm: toMoneyOrNull(m.internalHeightCm),
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// PRODUCT PACKING DATA  ·  بيانات تغليف المنتجات
// ═════════════════════════════════════════════════════════════════════════════

const packingDataSchema = z.object({
  variantId: z.string().trim().max(128).nullable().optional(),
  packedHeightCm: dimensionSchema.nullable().optional(),
  packedWidthCm: dimensionSchema.nullable().optional(),
  packedDepthCm: dimensionSchema.nullable().optional(),
  packedWeightKg: z.number().finite().positive().max(500).nullable().optional(),
  rotationAllowed: z.boolean().optional(),
  mustStayUpright: z.boolean().optional(),
  fragile: z.boolean().optional(),
  compressible: z.boolean().optional(),
  canSupportItemsAbove: z.boolean().optional(),
  maxSupportedWeightAboveKg: z.number().finite().min(0).max(500).nullable().optional(),
  minimumSupportRatio: ratioSchema.nullable().optional(),
  maximumOverhangRatio: ratioSchema.nullable().optional(),
  requiresFullBaseSupport: z.boolean().optional(),
  foldable: z.boolean().optional(),
  foldedHeightCm: dimensionSchema.nullable().optional(),
  foldedWidthCm: dimensionSchema.nullable().optional(),
  foldedDepthCm: dimensionSchema.nullable().optional(),
  safetyAllowanceCm: z.number().finite().min(0).max(50).nullable().optional(),
  requiresSeparateCarton: z.boolean().optional(),
  maxQtyPerCarton: z.number().int().positive().max(10_000).nullable().optional(),
  notes: z.string().trim().max(500).optional(),
});

router.get(
  "/products/:productId/packing",
  readLimiter,
  wrap(async (req, res) => {
    const productId = idSchema.parse(req.params.productId);
    const rows = await db()
      .select()
      .from(productPackingData)
      .where(eq(productPackingData.productId, productId));
    res.json({ items: rows });
  }),
);

router.put(
  "/products/:productId/packing",
  writeLimiter,
  wrap(async (req, res) => {
    const parsed = packingDataSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: "VALIDATION_INVALID", details: parsed.error.flatten() });
      return;
    }
    const productId = idSchema.parse(req.params.productId);
    const variantId = parsed.data.variantId ?? null;
    const values: Record<string, unknown> = { updatedAt: new Date(), source: "owner_measured" };
    for (const [k, v] of Object.entries(parsed.data)) {
      if (k === "variantId" || v === undefined) continue;
      values[k] = typeof v === "number" ? String(v) : v;
    }

    const [existing] = await db()
      .select()
      .from(productPackingData)
      .where(
        and(
          eq(productPackingData.productId, productId),
          variantId == null
            ? isNull(productPackingData.variantId)
            : eq(productPackingData.variantId, variantId),
        ),
      )
      .limit(1);

    if (existing) {
      await db().update(productPackingData).set(values).where(eq(productPackingData.id, existing.id));
      res.json({ id: existing.id, updated: true });
      return;
    }
    const id = randomUUID();
    await db()
      .insert(productPackingData)
      .values({ id, productId, variantId, ...values } as never);
    auditLog("packing-data.upsert", { productId, variantId });
    res.status(201).json({ id, updated: false });
  }),
);

router.get(
  "/packing/missing",
  readLimiter,
  wrap(async (_req, res) => {
    const rows = await db().execute(sql`
      SELECT p.id AS product_id, p.name AS product_name,
             d.variant_id, d.packed_height_cm, d.packed_width_cm,
             d.packed_depth_cm, d.packed_weight_kg,
             EXISTS (
               SELECT 1
                 FROM packing_import_draft_lines line
                 JOIN packing_import_drafts draft ON draft.id = line.draft_id
                WHERE line.matched_product_id = p.id
                  AND line.match_confidence = 'probable'
                  AND draft.state = 'reviewing'
             ) AS manual_review
        FROM products p
        LEFT JOIN LATERAL (
          SELECT packing.variant_id, packing.packed_height_cm, packing.packed_width_cm,
                 packing.packed_depth_cm, packing.packed_weight_kg
            FROM product_packing_data packing
           WHERE packing.product_id = p.id
           ORDER BY (packing.variant_id IS NULL) DESC, packing.updated_at DESC
           LIMIT 1
        ) d ON true
       WHERE p.deleted_at IS NULL
       ORDER BY p.name
    `);
    const list = (Array.isArray(rows) ? rows : ((rows as { rows?: unknown[] }).rows ?? [])) as Record<string, unknown>[];
    const result = summarisePackingCompleteness(list.map((row) => ({
      productId: String(row.product_id),
      productName: String(row.product_name),
      variantId: row.variant_id == null ? null : String(row.variant_id),
      packedHeightCm: row.packed_height_cm,
      packedWidthCm: row.packed_width_cm,
      packedDepthCm: row.packed_depth_cm,
      packedWeightKg: row.packed_weight_kg,
      manualReview: row.manual_review === true,
    })));
    res.json(result);
  }),
);

// ═════════════════════════════════════════════════════════════════════════════
// EXCEL IMPORT  ·  استيراد ملف القياسات
// ═════════════════════════════════════════════════════════════════════════════

const importUploadSchema = z.object({
  fileName: z.string().trim().min(1).max(300),
  fileHash: z.string().trim().max(128).optional(),
  sheetName: z.string().trim().max(200).optional(),
  rows: z
    .array(
      z.object({
        rowNumber: z.number().int().positive(),
        productName: z.string().trim().min(1).max(400),
        pieceCount: z.string().trim().max(64).nullable().optional(),
        packedHeight: z.string().trim().max(64).nullable().optional(),
        packedWidth: z.string().trim().max(64).nullable().optional(),
        foldable: z.string().trim().max(64).nullable().optional(),
      }),
    )
    .min(1)
    .max(5000),
});

router.post(
  "/packing-import",
  writeLimiter,
  wrap(async (req, res) => {
    const parsed = importUploadSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: "VALIDATION_INVALID", details: parsed.error.flatten() });
      return;
    }
    const catalog = await db()
      .select({ id: products.id, name: products.name })
      .from(products)
      .where(isNull(products.deletedAt));

    const rows = parseImportSheet(parsed.data.rows as RawSheetRow[], catalog);
    const draftId = randomUUID();

    await db().insert(packingImportDrafts).values({
      id: draftId,
      fileName: parsed.data.fileName,
      fileHash: parsed.data.fileHash ?? null,
      sheetName: parsed.data.sheetName ?? null,
      rowCount: rows.length,
      state: "reviewing",
      importedBy: actorFromRequest(req),
    });
    for (const r of rows) {
      await db().insert(packingImportDraftLines).values({
        id: randomUUID(),
        draftId,
        rowNumber: r.rowNumber,
        rawProductName: r.rawProductName,
        rawPieceCount: r.rawPieceCount,
        rawHeight: r.rawHeight,
        rawWidth: r.rawWidth,
        rawFoldable: r.rawFoldable,
        packedHeightCm: r.packedHeightCm != null ? String(r.packedHeightCm) : null,
        packedWidthCm: r.packedWidthCm != null ? String(r.packedWidthCm) : null,
        foldable: r.foldable,
        matchedProductId: r.matchedProductId,
        matchConfidence: r.matchConfidence,
        matchCandidates: r.matchCandidates,
        parseWarnings: r.parseWarnings,
      });
    }
    auditLog("import.upload", { draftId, rows: rows.length });
    res.status(201).json({ draftId, summary: summariseImport(rows), rows });
  }),
);

router.get(
  "/packing-import/:id",
  readLimiter,
  wrap(async (req, res) => {
    const draftId = idSchema.parse(req.params.id);
    const [draft] = await db()
      .select()
      .from(packingImportDrafts)
      .where(eq(packingImportDrafts.id, draftId))
      .limit(1);
    if (!draft) {
      res.status(404).json({ error: "DRAFT_NOT_FOUND" });
      return;
    }
    const lines = await db()
      .select()
      .from(packingImportDraftLines)
      .where(eq(packingImportDraftLines.draftId, draftId));
    res.json({ draft, lines: lines.sort((a, b) => a.rowNumber - b.rowNumber) });
  }),
);

const confirmImportSchema = z.object({
  confirmedRowNumbers: z.array(z.number().int().positive()).max(5000),
  reason: reasonSchema,
});

router.post(
  "/packing-import/:id/confirm",
  writeLimiter,
  wrap(async (req, res) => {
    const parsed = confirmImportSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: "VALIDATION_INVALID", details: parsed.error.flatten() });
      return;
    }
    const draftId = idSchema.parse(req.params.id);
    const lines = await db()
      .select()
      .from(packingImportDraftLines)
      .where(eq(packingImportDraftLines.draftId, draftId));

    const parsedRows = lines.map((l) => ({
      rowNumber: l.rowNumber,
      rawProductName: l.rawProductName,
      rawPieceCount: l.rawPieceCount,
      rawHeight: l.rawHeight,
      rawWidth: l.rawWidth,
      rawFoldable: l.rawFoldable,
      packedHeightCm: toMoneyOrNull(l.packedHeightCm),
      packedWidthCm: toMoneyOrNull(l.packedWidthCm),
      foldable: l.foldable,
      matchedProductId: l.matchedProductId,
      matchConfidence: l.matchConfidence as "exact" | "probable" | "ambiguous",
      matchCandidates: [],
      parseWarnings: [],
    }));

    // `ambiguous` rows are filtered out inside selectApplicableRows and cannot be
    // unlocked by confirming them — an undecided match has nothing safe to apply.
    const applicable = selectApplicableRows(parsedRows, new Set(parsed.data.confirmedRowNumbers));

    let written = 0;
    for (const a of applicable) {
      const [existing] = await db()
        .select()
        .from(productPackingData)
        .where(
          and(eq(productPackingData.productId, a.productId), isNull(productPackingData.variantId)),
        )
        .limit(1);
      const values = {
        packedHeightCm: a.packedHeightCm != null ? String(a.packedHeightCm) : null,
        packedWidthCm: a.packedWidthCm != null ? String(a.packedWidthCm) : null,
        foldable: a.foldable,
        source: "excel_import" as const,
        importDraftId: draftId,
        updatedAt: new Date(),
      };
      if (existing) {
        await db().update(productPackingData).set(values).where(eq(productPackingData.id, existing.id));
      } else {
        await db()
          .insert(productPackingData)
          .values({ id: randomUUID(), productId: a.productId, variantId: null, ...values });
      }
      written++;
    }

    await db()
      .update(packingImportDrafts)
      .set({ state: "applied", appliedAt: new Date(), updatedAt: new Date() })
      .where(eq(packingImportDrafts.id, draftId));

    auditLog("import.confirm", { draftId, written });
    // NOTE: products.stock and variant stock are untouched. `عدد القطع` is
    // informational and has no field in the applied shape at all.
    res.json({ written, skipped: lines.length - written });
  }),
);

// ═════════════════════════════════════════════════════════════════════════════
// PACKING PLANS  ·  خطة تغليف الطلب
// ═════════════════════════════════════════════════════════════════════════════

/** Build planner inputs for an order from the live catalogue and packing data. */
async function buildPlannerInput(orderId: string) {
  const lines = await db().execute(sql`
    SELECT oi.product_id, oi.quantity, oi.metadata->>'variantId' AS variant_id, p.name
      FROM order_items_relational oi
      JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = ${orderId}
     ORDER BY oi.product_id
  `);
  const list = (Array.isArray(lines) ? lines : ((lines as { rows?: unknown[] }).rows ?? [])) as {
    product_id: string;
    quantity: number;
    variant_id: string | null;
    name: string;
  }[];

  const packing = await db().select().from(productPackingData);
  const byKey = new Map(packing.map((d) => [`${d.productId}|${d.variantId ?? ""}`, d]));

  const items: PackingItemSpec[] = [];
  const missing: { productId: string; variantId: string | null; productName: string; missing: string[] }[] = [];

  for (const l of list) {
    const d = byKey.get(`${l.product_id}|${l.variant_id ?? ""}`) ?? byKey.get(`${l.product_id}|`);
    const h = toMoneyOrNull(d?.packedHeightCm ?? null);
    const w = toMoneyOrNull(d?.packedWidthCm ?? null);
    const dep = toMoneyOrNull(d?.packedDepthCm ?? null);
    const wt = toMoneyOrNull(d?.packedWeightKg ?? null);
    const lacking = [
      h == null ? "packed_height_cm" : null,
      w == null ? "packed_width_cm" : null,
      dep == null ? "packed_depth_cm" : null,
      wt == null ? "packed_weight_kg" : null,
    ].filter(Boolean) as string[];

    if (lacking.length > 0) {
      missing.push({
        productId: l.product_id,
        variantId: l.variant_id,
        productName: l.name,
        missing: lacking,
      });
      continue;
    }
    const allowance = toMoneyOrNull(d?.safetyAllowanceCm ?? null) ?? 0;
    for (let seq = 1; seq <= Number(l.quantity); seq++) {
      items.push({
        key: `${l.product_id}|${l.variant_id ?? ""}|${seq}`,
        productId: l.product_id,
        variantId: l.variant_id,
        seq,
        name: l.name,
        widthMm: cmToMm((w as number) + allowance),
        heightMm: cmToMm((h as number) + allowance),
        depthMm: cmToMm((dep as number) + allowance),
        weightG: kgToG(wt as number),
        rotationAllowed: d?.rotationAllowed ?? true,
        mustStayUpright: d?.mustStayUpright ?? false,
        fragile: d?.fragile ?? false,
        compressible: d?.compressible ?? false,
        canSupportItemsAbove: d?.canSupportItemsAbove ?? false,
        maxSupportedWeightAboveG:
          toMoneyOrNull(d?.maxSupportedWeightAboveKg ?? null) != null
            ? kgToG(toMoneyOrNull(d?.maxSupportedWeightAboveKg ?? null) as number)
            : null,
        minSupportRatioBp: Math.round((toMoneyOrNull(d?.minimumSupportRatio ?? null) ?? 0) * 10_000),
        maxOverhangRatioBp:
          toMoneyOrNull(d?.maximumOverhangRatio ?? null) != null
            ? Math.round((toMoneyOrNull(d?.maximumOverhangRatio ?? null) as number) * 10_000)
            : -1,
        requiresFullBaseSupport: d?.requiresFullBaseSupport ?? false,
        requiresSeparateCarton: d?.requiresSeparateCarton ?? false,
        maxQtyPerCarton: d?.maxQtyPerCarton ?? null,
      });
    }
  }

  const cartonList = await cartonRows();
  const cartons: CartonSpec[] = [];
  for (const c of cartonList) {
    if (!c.active) continue;
    const L = toMoneyOrNull(c.internalLengthCm);
    const W = toMoneyOrNull(c.internalWidthCm);
    const H = toMoneyOrNull(c.internalHeightCm);
    const MW = toMoneyOrNull(c.maxWeightKg);
    if (L == null || W == null || H == null || MW == null) continue;
    const stock = await getCartonStock(db(), c.id);
    cartons.push({
      materialId: c.id,
      sku: c.sku ?? c.id,
      name: c.name,
      internalLengthMm: cmToMm(L),
      internalWidthMm: cmToMm(W),
      internalHeightMm: cmToMm(H),
      safetyPaddingMm: cmToMm(toMoneyOrNull(c.safetyPaddingCm) ?? 0),
      maxWeightG: kgToG(MW),
      unitCost: toMoneyOrNull(c.currentUnitCost),
      availableQty: stock.available,
    });
  }

  return { items, cartons, missing };
}

router.post(
  "/orders/:orderId/plan",
  readLimiter,
  wrap(async (req, res) => {
    const orderId = idSchema.parse(req.params.orderId);
    const { items, cartons, missing } = await buildPlannerInput(orderId);
    const policy = await loadPolicy();
    const result = planOrder({ items, cartons, missing, policy });
    auditLog("plan.generate", { orderId, outcome: result.outcome });
    res.json(result);
  }),
);

const savePlanSchema = z.object({
  idempotencyKey: idempotencySchema,
  reason: reasonSchema.optional(),
});

router.post(
  "/orders/:orderId/plan/validate",
  writeLimiter,
  wrap(async (req, res) => {
    const parsed = savePlanSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: "VALIDATION_INVALID" });
      return;
    }
    const orderId = idSchema.parse(req.params.orderId);
    const { items, cartons, missing } = await buildPlannerInput(orderId);
    const policy = await loadPolicy();
    const result = planOrder({ items, cartons, missing, policy });

    if (result.outcome !== "plan") {
      // A plan that could not be produced is never stored as validated.
      res.status(400).json({ error: "VALIDATION_FAILED", result });
      return;
    }
    // Re-validate what we are about to persist. Nothing reaches `validated`
    // without passing the full safety layer at write time.
    const safety = validatePlanSafety(result.cartons, policy);
    if (!safety.ok) {
      res.status(400).json({ error: "VALIDATION_FAILED", safety });
      return;
    }

    const planId = randomUUID();
    await db().insert(orderPackingPlans).values({
      id: planId,
      orderId,
      state: "validated",
      planHash: result.planHash,
      engineVersion: result.engineVersion,
      cartonCount: result.cartons.length,
      totalKnownCost: result.totalKnownCost != null ? String(result.totalKnownCost) : null,
      costStatus: result.costStatus,
      validationReport: safety as unknown as Record<string, unknown>,
      explanationAr: result.explanationAr,
      createdBy: actorFromRequest(req),
    });
    for (const c of result.cartons) {
      for (const p of c.items) {
        await db().insert(orderPackingPlanItems).values({
          id: randomUUID(),
          planId,
          cartonIndex: c.cartonIndex,
          materialId: c.carton.materialId,
          productId: p.item.productId,
          variantId: p.item.variantId,
          unitSeq: p.item.seq,
          productNameSnapshot: p.item.name,
          posXMm: p.xMm,
          posYMm: p.yMm,
          posZMm: p.zMm,
          dimXMm: p.dxMm,
          dimYMm: p.dyMm,
          dimZMm: p.dzMm,
          rotationType: p.rotationType,
          weightG: p.item.weightG,
          supportRatioBp: safety.supportRatioBp[p.key] ?? null,
          loadOnG: safety.loadOnG[p.key] ?? null,
        });
      }
    }
    // Put the chosen carton into the order's cost snapshot.
    //
    // Reserving moves INVENTORY; this moves COST. Without it a carton could be
    // planned, reserved, consumed and deducted from stock while its price never
    // reached the order's internal profit.
    const costing = await syncPlanCartonsToDraft(db(), orderId);

    auditLog("plan.validate", {
      orderId, planId, cartons: result.cartons.length, costing: costing.detail,
    });
    res.status(201).json({
      planId,
      planHash: result.planHash,
      costStatus: result.costStatus,
      cartonCosting: costing.detail,
    });
  }),
);

router.get(
  "/orders/:orderId/plan",
  readLimiter,
  wrap(async (req, res) => {
    const orderId = idSchema.parse(req.params.orderId);
    const [plan] = await db()
      .select()
      .from(orderPackingPlans)
      .where(eq(orderPackingPlans.orderId, orderId))
      .orderBy(desc(orderPackingPlans.createdAt))
      .limit(1);
    if (!plan) {
      res.json({ plan: null, items: [] });
      return;
    }
    const items = await db()
      .select()
      .from(orderPackingPlanItems)
      .where(eq(orderPackingPlanItems.planId, plan.id));
    res.json({ plan, items });
  }),
);

// ── Reservations ────────────────────────────────────────────────────────────

const reserveSchema = z.object({
  planId: idSchema.optional(),
  idempotencyKey: idempotencySchema,
});

router.post(
  "/orders/:orderId/reserve",
  writeLimiter,
  wrap(async (req, res) => {
    const parsed = reserveSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: "VALIDATION_INVALID" });
      return;
    }
    const orderId = idSchema.parse(req.params.orderId);

    const [plan] = await db()
      .select()
      .from(orderPackingPlans)
      .where(eq(orderPackingPlans.orderId, orderId))
      .orderBy(desc(orderPackingPlans.createdAt))
      .limit(1);
    // Only a validated plan may hold stock. This is the structural reason there
    // is no bypass: an unsafe arrangement never reaches `validated`.
    if (!plan || plan.state !== "validated") {
      res.status(409).json({ error: "PLAN_NOT_VALIDATED" });
      return;
    }

    const planItems = await db()
      .select()
      .from(orderPackingPlanItems)
      .where(eq(orderPackingPlanItems.planId, plan.id));
    const quantities = new Map<string, number>();
    const seenCarton = new Set<number>();
    for (const it of planItems) {
      if (!it.materialId || seenCarton.has(it.cartonIndex)) continue;
      seenCarton.add(it.cartonIndex);
      quantities.set(it.materialId, (quantities.get(it.materialId) ?? 0) + 1);
    }

    const result = await reserveCartons(db(), {
      orderId,
      planId: plan.id,
      quantities,
      requestId: parsed.data.idempotencyKey,
      reservedBy: actorFromRequest(req),
    });
    await db()
      .update(orderPackingPlans)
      .set({ state: "reserved", updatedAt: new Date() })
      .where(eq(orderPackingPlans.id, plan.id));
    for (const materialId of quantities.keys()) await afterStockChange(materialId);

    auditLog("plan.reserve", { orderId, planId: plan.id, reused: String(result.reused) });
    res.status(result.reused ? 200 : 201).json(result);
  }),
);

router.post(
  "/orders/:orderId/release",
  writeLimiter,
  wrap(async (req, res) => {
    const orderId = idSchema.parse(req.params.orderId);
    const reason = reasonSchema.parse((req.body ?? {}).reason);
    const affected = await db()
      .select({ materialId: cartonReservations.materialId })
      .from(cartonReservations)
      .where(and(eq(cartonReservations.orderId, orderId), eq(cartonReservations.state, "active")));
    const released = await releaseOrderReservations(db(), orderId, reason);
    for (const a of affected) await afterStockChange(a.materialId);
    auditLog("plan.release", { orderId, released });
    res.json({ released });
  }),
);

const changeCartonSchema = z.object({
  quantities: z.record(z.string(), z.number().int().positive().max(1000)),
  idempotencyKey: idempotencySchema,
  reason: reasonSchema,
});

router.post(
  "/orders/:orderId/change-carton",
  writeLimiter,
  wrap(async (req, res) => {
    const parsed = changeCartonSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: "VALIDATION_INVALID", details: parsed.error.flatten() });
      return;
    }
    const orderId = idSchema.parse(req.params.orderId);
    const quantities = new Map(Object.entries(parsed.data.quantities));
    // Release-and-reserve happen in ONE transaction, so stock is never briefly
    // double-held nor briefly unheld.
    const result = await changeReservedCarton(db(), {
      orderId,
      newQuantities: quantities,
      requestId: parsed.data.idempotencyKey,
      reason: parsed.data.reason,
      changedBy: actorFromRequest(req),
    });
    await recordFinancialChange({
      entityType: "order_packing_plan",
      entityId: orderId,
      fieldName: "carton_changed",
      oldValue: null,
      newValue: JSON.stringify(parsed.data.quantities),
      reason: parsed.data.reason,
      actor: actorFromRequest(req),
    });
    for (const materialId of quantities.keys()) await afterStockChange(materialId);
    auditLog("plan.change-carton", { orderId });
    res.json(result);
  }),
);

const manualPackSchema = z.object({ reason: reasonSchema });

router.post(
  "/orders/:orderId/manual-pack-required",
  writeLimiter,
  wrap(async (req, res) => {
    const parsed = manualPackSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: "REASON_REQUIRED" });
      return;
    }
    const orderId = idSchema.parse(req.params.orderId);

    // Leaving the automated model releases every hold: an order packed outside
    // the model must not sit on reserved stock it may never use.
    const affected = await db()
      .select({ materialId: cartonReservations.materialId })
      .from(cartonReservations)
      .where(and(eq(cartonReservations.orderId, orderId), eq(cartonReservations.state, "active")));
    if (affected.length > 0) {
      await releaseOrderReservations(db(), orderId, parsed.data.reason);
    }

    await db()
      .update(orderPackingPlans)
      .set({ state: "superseded", updatedAt: new Date() })
      .where(
        and(
          eq(orderPackingPlans.orderId, orderId),
          inArray(orderPackingPlans.state, ["proposed", "validated", "reserved"]),
        ),
      );
    const planId = randomUUID();
    await db().insert(orderPackingPlans).values({
      id: planId,
      orderId,
      state: "manual_pack_required",
      manualReason: parsed.data.reason,
      createdBy: actorFromRequest(req),
    });
    await recordFinancialChange({
      entityType: "order_packing_plan",
      entityId: orderId,
      fieldName: "manual_pack_required",
      oldValue: null,
      newValue: "manual_pack_required",
      reason: parsed.data.reason,
      actor: actorFromRequest(req),
    });
    for (const a of affected) await afterStockChange(a.materialId);
    auditLog("plan.manual-pack-required", { orderId, planId, released: affected.length });
    res.status(201).json({ planId, releasedReservations: affected.length });
  }),
);

// ═════════════════════════════════════════════════════════════════════════════
// ALERTS  ·  تنبيهات انخفاض المخزون
// ═════════════════════════════════════════════════════════════════════════════

router.get(
  "/alerts",
  readLimiter,
  wrap(async (_req, res) => {
    const rows = await db()
      .select()
      .from(adminStockAlerts)
      .where(eq(adminStockAlerts.state, "open"))
      .orderBy(desc(adminStockAlerts.openedAt));
    res.json({ items: rows });
  }),
);

router.post(
  "/alerts/:id/acknowledge",
  writeLimiter,
  wrap(async (req, res) => {
    const id = idSchema.parse(req.params.id);
    // Acknowledging is not closing. Only stock rising above the threshold closes
    // an alert, which is what makes re-arming meaningful.
    await db()
      .update(adminStockAlerts)
      .set({ acknowledgedBy: actorFromRequest(req), acknowledgedAt: new Date() })
      .where(eq(adminStockAlerts.id, id));
    auditLog("alert.acknowledge", { id });
    res.json({ ok: true });
  }),
);

// ═════════════════════════════════════════════════════════════════════════════
// RETURN CARTON LOSS  ·  تقرير الكراتين التالفة
// ═════════════════════════════════════════════════════════════════════════════

/** The consumed lines of an order's confirmed original shipment. */
async function consumedLinesOf(orderId: string): Promise<ConsumedLine[]> {
  const rows = await db().execute(sql`
    SELECT l.id, l.event_id, l.material_id, l.material_name_snapshot,
           m.material_kind, l.quantity, l.unit_cost_snapshot, l.total_cost, l.cost_status
      FROM order_fulfillment_lines l
      JOIN order_fulfillment_events e ON e.id = l.event_id
      LEFT JOIN fulfillment_materials m ON m.id = l.material_id
     WHERE l.order_id = ${orderId}
       AND e.workflow_state IN ('confirmed','adjusted')
       AND e.reversal_of_event_id IS NULL
     ORDER BY l.id
  `);
  const list = (Array.isArray(rows) ? rows : ((rows as { rows?: unknown[] }).rows ?? [])) as Record<
    string,
    unknown
  >[];
  return list.map((r) => ({
    lineId: String(r.id),
    eventId: String(r.event_id),
    materialId: r.material_id == null ? null : String(r.material_id),
    materialName: String(r.material_name_snapshot),
    materialKind: r.material_kind == null ? null : String(r.material_kind),
    quantity: Number(r.quantity),
    unitCostSnapshot: toMoneyOrNull(r.unit_cost_snapshot as string | null),
    totalCost: toMoneyOrNull(r.total_cost as string | null),
    costStatus: String(r.cost_status),
  }));
}

async function existingClassifications(orderId: string) {
  return db()
    .select()
    .from(orderReturnPackagingLosses)
    .where(eq(orderReturnPackagingLosses.orderId, orderId));
}

const fullReturnSchema = z.object({ returnEventId: idSchema });

router.post(
  "/orders/:orderId/return-loss/full",
  writeLimiter,
  wrap(async (req, res) => {
    const parsed = fullReturnSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: "VALIDATION_INVALID" });
      return;
    }
    const orderId = idSchema.parse(req.params.orderId);
    const lines = await consumedLinesOf(orderId);
    const existing = await existingClassifications(orderId);
    const classified = buildClassifiedQuantities(
      existing.map((e) => ({
        fulfillmentLineId: e.fulfillmentLineId as string,
        quantity: Number(e.quantity),
      })),
    );

    // Cartons only. The sticker and the card came back with the order and are
    // not losses — they are never in this list to begin with.
    const rows = classifyFullReturn(lines, parsed.data.returnEventId, classified);
    for (const c of rows) {
      await db()
        .insert(orderReturnPackagingLosses)
        .values({
          id: randomUUID(),
          orderId,
          returnEventId: c.returnEventId,
          fulfillmentEventId: c.fulfillmentEventId,
          fulfillmentLineId: c.fulfillmentLineId,
          materialId: c.materialId,
          materialNameSnapshot: c.materialNameSnapshot,
          quantity: String(c.quantity),
          originalUnitCostSnapshot:
            c.originalUnitCostSnapshot != null ? String(c.originalUnitCostSnapshot) : null,
          originalTotalCostSnapshot:
            c.originalTotalCostSnapshot != null ? String(c.originalTotalCostSnapshot) : null,
          originalCostStatus: c.originalCostStatus,
          lossCategory: c.lossCategory,
          classificationMode: c.classificationMode,
          isReclassificationOnly: true,
          reason: c.reason,
          recordedBy: actorFromRequest(req),
        })
        .onConflictDoNothing();
    }
    auditLog("return-loss.full", { orderId, classified: rows.length });
    // No inventory movement is written here — the carton left stock at shipment
    // and never comes back.
    res.status(201).json({ classified: rows.length, rows });
  }),
);

const adminDamageSchema = z.object({
  returnEventId: idSchema,
  fulfillmentLineId: idSchema,
  quantity: z.number().finite().positive().max(10_000),
  lossCategory: z.enum(["damaged_carton", "damaged_material", "missing_material"]),
  reason: reasonSchema,
});

router.post(
  "/orders/:orderId/return-loss/record",
  writeLimiter,
  wrap(async (req, res) => {
    const parsed = adminDamageSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: "VALIDATION_INVALID", details: parsed.error.flatten() });
      return;
    }
    const orderId = idSchema.parse(req.params.orderId);
    const lines = await consumedLinesOf(orderId);
    const existing = await existingClassifications(orderId);
    const classified = buildClassifiedQuantities(
      existing.map((e) => ({
        fulfillmentLineId: e.fulfillmentLineId as string,
        quantity: Number(e.quantity),
      })),
    );

    const c = classifyAdminRecordedDamage(
      {
        fulfillmentLineId: parsed.data.fulfillmentLineId,
        quantity: parsed.data.quantity,
        lossCategory: parsed.data.lossCategory,
        reason: parsed.data.reason,
      },
      lines,
      parsed.data.returnEventId,
      classified,
    );

    await db().insert(orderReturnPackagingLosses).values({
      id: randomUUID(),
      orderId,
      returnEventId: c.returnEventId,
      fulfillmentEventId: c.fulfillmentEventId,
      fulfillmentLineId: c.fulfillmentLineId,
      materialId: c.materialId,
      materialNameSnapshot: c.materialNameSnapshot,
      quantity: String(c.quantity),
      originalUnitCostSnapshot:
        c.originalUnitCostSnapshot != null ? String(c.originalUnitCostSnapshot) : null,
      originalTotalCostSnapshot:
        c.originalTotalCostSnapshot != null ? String(c.originalTotalCostSnapshot) : null,
      originalCostStatus: c.originalCostStatus,
      lossCategory: c.lossCategory,
      classificationMode: c.classificationMode,
      isReclassificationOnly: true,
      reason: c.reason,
      recordedBy: actorFromRequest(req),
    });
    auditLog("return-loss.record", { orderId, line: c.fulfillmentLineId, qty: c.quantity });
    res.status(201).json({ classification: c });
  }),
);

router.get(
  "/orders/:orderId/return-loss",
  readLimiter,
  wrap(async (req, res) => {
    const orderId = idSchema.parse(req.params.orderId);
    const rows = await existingClassifications(orderId);
    const byEvent = new Map<string, number>();
    let total = 0;
    let incomplete = false;
    for (const r of rows) {
      const amount = toMoneyOrNull(r.originalTotalCostSnapshot);
      if (amount == null) incomplete = true;
      else {
        total += amount;
        byEvent.set(r.returnEventId, (byEvent.get(r.returnEventId) ?? 0) + amount);
      }
    }
    res.json({
      rows,
      // Each return event reports only its own loss; the order total is their
      // sum. Both are RECLASSIFICATIONS of cost already recognised at shipment —
      // neither is deducted from profit again.
      perReturnEvent: Object.fromEntries(byEvent),
      orderTotal: incomplete ? null : total,
      isReclassificationOnly: true,
    });
  }),
);

export default router;
