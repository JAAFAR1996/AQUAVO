// ─────────────────────────────────────────────────────────────────────────────
// Admin API for per-order fulfillment costing (item 7).
//
// HARD RULE: this file contains NO financial arithmetic. Every number returned
// here is produced by a canonical service:
//   * accounting-engine.ts          → revenue / COGS / contribution profit
//   * fulfillment-service.ts        → confirmation, reversal, event history
//   * fulfillment-draft-service.ts  → draft totals, expected cost
//   * packaging-profile-service.ts  → profile expected cost, suggestions
//   * material-cost-service.ts      → approved costs and their history
// A route handler's only jobs are: authenticate, authorize, validate, delegate,
// audit and serialize.
//
// Cross-cutting: admin auth on every route, Zod validation on every body/param,
// idempotency keys on every mutation, an audit-trail entry per financial write,
// rate limits on write endpoints, and PII-safe logging (IDs only — never customer
// names, phones or addresses).
// ─────────────────────────────────────────────────────────────────────────────
import { Router, type Request, type Response, type NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { eq, desc, and, sql } from "drizzle-orm";
import { requireAdmin } from "../middleware/auth.js";
import { getDb } from "../db.js";
import {
  fulfillmentMaterials, packagingPurchases, packagingInventoryMovements,
} from "../../shared/schema.js";
import { toMoneyOrNull } from "../../shared/order-financials.js";
import {
  recordFinancialChange, actorFromRequest,
} from "../services/accountingAuditTrail.js";
import type { FulfillmentDb } from "../services/fulfillment-db.js";
import {
  confirmFulfillment, reverseFulfillmentEvent, getFulfillmentHistory,
  FULFILLMENT_EVENT_TYPES,
} from "../services/fulfillment-service.js";
import {
  proposeMaterialCost, approveMaterialCost, rejectMaterialCost,
  getMaterialCostHistory, getApprovedCost,
} from "../services/material-cost-service.js";
import {
  createProfileFamily, createProfileVersion, listProfileFamilies, getProfileFamily,
  setProfileVersionActive, setFamilyActive, calculateExpectedCost,
  getProfileVersionUsage, suggestProfileForOrder,
} from "../services/packaging-profile-service.js";
import {
  getOrCreateDraft, getDraft, listOrderDrafts, addCatalogLine, addManualLine,
  updateDraftLine, removeDraftLine, markAwaitingConfirmation, discardDraft, confirmDraft,
  MANUAL_LINE_CATEGORIES, MANUAL_LINE_CATEGORY_LABELS,
} from "../services/fulfillment-draft-service.js";
import { computeOrderCostBreakdown } from "../services/accounting-engine.js";
import { verifyFulfillmentIntegrity } from "../services/fulfillment-verifier.js";

const router = Router();

// ── Cross-cutting middleware ────────────────────────────────────────────────

// Writes are owner actions from an admin console: generous enough for real work,
// tight enough that a runaway client cannot flood the ledger.
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "طلبات كثيرة — انتظر دقيقة وحاول مرة ثانية" },
});
const readLimiter = rateLimit({
  windowMs: 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false,
});

router.use(requireAdmin);

function db(): FulfillmentDb {
  const d = getDb() as FulfillmentDb | null;
  if (!d) throw new Error("Database not available");
  return d;
}

/** PII-safe logging: identifiers and amounts only — never customer PII. */
function auditLog(event: string, fields: Record<string, string | number | null | undefined>): void {
  const safe = Object.entries(fields)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${v ?? "null"}`).join(" ");
  console.log(`[fulfillment] ${event} ${safe}`);
}

/** Map domain errors onto meaningful status codes; everything else is a 500. */
const DOMAIN_ERROR_STATUS: Array<[RegExp, number]> = [
  [/NOT_FOUND/, 404],
  [/ALREADY_EXISTS|ALREADY_REVERSED|ACTIVE_REVERSAL_EXISTS|DRAFT_CONSUMED|DRAFT_DISCARDED/, 409],
  [/INSUFFICIENT_STOCK|QUANTITY_INVALID|NEGATIVE_COST|DRAFT_EMPTY|CATEGORY_INVALID|_REQUIRED|_MISMATCH|_INVALID|NOT_PENDING|NOT_SETTLED|MATERIAL_INACTIVE|SELF_REVERSAL|_NEEDS_|STOCK_OVERRIDE_REMOVED/, 400],
];

function wrap(handler: (req: Request, res: Response) => Promise<void>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await handler(req, res);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const match = DOMAIN_ERROR_STATUS.find(([re]) => re.test(message));
      if (match) {
        auditLog("rejected", { code: message.split(":")[0], status: match[1] });
        res.status(match[1]).json({ error: message });
        return;
      }
      next(err);
    }
  };
}

// Shared validators
const idSchema = z.string().min(1).max(128);
const moneySchema = z.number().finite().min(0);
const quantitySchema = z.number().finite().positive();
/** Every mutation carries a stable client-generated key so retries are safe. */
const idempotencySchema = z.string().min(4).max(200);

// ═════════════════════════════════════════════════════════════════════════════
// MATERIALS
// ═════════════════════════════════════════════════════════════════════════════

router.get("/materials", readLimiter, wrap(async (req, res) => {
  const includeInactive = req.query.includeInactive === "true";
  const rows = includeInactive
    ? await db().select().from(fulfillmentMaterials)
    : await db().select().from(fulfillmentMaterials).where(eq(fulfillmentMaterials.active, true));

  const enriched = [];
  for (const m of rows) {
    const cost = await getApprovedCost(db(), m.id);
    const [bal] = await db()
      .select({ b: sql<string>`COALESCE(SUM(${packagingInventoryMovements.quantity}), 0)` })
      .from(packagingInventoryMovements)
      .where(eq(packagingInventoryMovements.materialId, m.id));
    enriched.push({
      id: m.id, name: m.name, category: m.category, unit: m.unit,
      currency: m.currency, accountingCode: m.accountingCode, active: m.active, notes: m.notes,
      approvedCost: cost,                       // source of truth
      stockBalance: Number(bal?.b ?? 0),
    });
  }
  res.json({ materials: enriched });
}));

const createMaterialSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().max(50).optional().nullable(),
  unit: z.string().max(30).optional().nullable(),
  accountingCode: z.string().max(50).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

router.post("/materials", writeLimiter, wrap(async (req, res) => {
  const input = createMaterialSchema.parse(req.body ?? {});
  const actor = actorFromRequest(req);
  const id = crypto.randomUUID();
  // A new material starts with an UNKNOWN cost. A cost only exists once a
  // material_cost_records row is approved — never at creation time.
  //
  // stock_tracked is set EXPLICITLY rather than left to the column default.
  // Migration 0040 defaults it to false, and the confirmation stock guard now
  // trusts the flag, so a material created here without it would be silently
  // exempt from the guard — its stock could go negative with no error and no
  // override. Materials created through this route are physical consumables;
  // the accounting-only ones are created through the packaging-admin
  // preparation-costs route, which sets false on purpose.
  await db().insert(fulfillmentMaterials).values({
    id, name: input.name, category: input.category ?? null, unit: input.unit ?? null,
    accountingCode: input.accountingCode ?? null, notes: input.notes ?? null,
    stockTracked: true,
  });
  await recordFinancialChange(db() as never, {
    entityType: "fulfillment_material", entityId: id, action: "create",
    newValue: { name: input.name, category: input.category },
    performedBy: actor.id, performedByName: actor.name,
  });
  auditLog("material.create", { materialId: id, by: actor.id });
  res.status(201).json({ id });
}));

const updateMaterialSchema = createMaterialSchema.partial();

router.patch("/materials/:id", writeLimiter, wrap(async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const input = updateMaterialSchema.parse(req.body ?? {});
  const actor = actorFromRequest(req);
  // DESCRIPTIVE fields only. Cost fields are unreachable from here by design —
  // they can only move through the approval flow below.
  await db().update(fulfillmentMaterials).set({ ...input, updatedAt: new Date() })
    .where(eq(fulfillmentMaterials.id, id));
  await recordFinancialChange(db() as never, {
    entityType: "fulfillment_material", entityId: id, action: "update",
    newValue: input, performedBy: actor.id, performedByName: actor.name,
  });
  res.json({ ok: true });
}));

router.post("/materials/:id/deactivate", writeLimiter, wrap(async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const actor = actorFromRequest(req);
  // Deactivate, never delete: historical events reference this row.
  await db().update(fulfillmentMaterials).set({ active: false, updatedAt: new Date() })
    .where(eq(fulfillmentMaterials.id, id));
  await recordFinancialChange(db() as never, {
    entityType: "fulfillment_material", entityId: id, action: "status_change",
    newValue: { active: false }, performedBy: actor.id, performedByName: actor.name,
  });
  auditLog("material.deactivate", { materialId: id, by: actor.id });
  res.json({ ok: true });
}));

// ── Purchases ───────────────────────────────────────────────────────────────

const purchaseSchema = z.object({
  materialId: idSchema,
  quantity: quantitySchema,
  totalCost: moneySchema.nullable(),          // null = unknown, never 0
  supplier: z.string().max(200).optional().nullable(),
  purchaseInvoiceUrl: z.string().url().max(1000).optional().nullable(),
  purchaseDate: z.string().datetime().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  idempotencyKey: idempotencySchema,
});

router.get("/materials/:id/purchases", readLimiter, wrap(async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const rows = await db().select().from(packagingPurchases)
    .where(eq(packagingPurchases.materialId, id))
    .orderBy(desc(packagingPurchases.createdAt));
  res.json({ purchases: rows });
}));

router.post("/purchases", writeLimiter, wrap(async (req, res) => {
  const input = purchaseSchema.parse(req.body ?? {});
  const actor = actorFromRequest(req);
  const id = crypto.randomUUID();
  const idem = `purchase:${input.idempotencyKey}`;

  // A purchase RECEIPT is a stock movement; the unique idempotency key on the
  // movement ledger makes a retried request a no-op rather than double stock.
  const existing = await db().select().from(packagingInventoryMovements)
    .where(eq(packagingInventoryMovements.idempotencyKey, idem)).limit(1);
  if (existing[0]) {
    res.json({ id: existing[0].purchaseId, reused: true });
    return;
  }

  // unit cost is DERIVED, never supplied — it cannot disagree with total/quantity.
  const total = input.totalCost;
  const unitCost = total == null ? null : total / input.quantity;

  await db().transaction(async (tx) => {
    await tx.insert(packagingPurchases).values({
      id, materialId: input.materialId, quantity: String(input.quantity),
      totalCost: total == null ? null : String(total),
      unitCost: unitCost == null ? null : String(unitCost),
      supplier: input.supplier ?? null,
      purchaseInvoiceUrl: input.purchaseInvoiceUrl ?? null,
      purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : null,
      notes: input.notes ?? null,
    });
    await tx.insert(packagingInventoryMovements).values({
      id: crypto.randomUUID(), materialId: input.materialId, purchaseId: id,
      movementType: "purchase_receipt", quantity: String(input.quantity),
      idempotencyKey: idem, recordedBy: actor.id ?? null,
    });
  });

  await recordFinancialChange(db() as never, {
    entityType: "fulfillment_purchase", entityId: id, action: "create",
    newValue: { materialId: input.materialId, quantity: input.quantity, totalCost: total },
    performedBy: actor.id, performedByName: actor.name,
  });
  auditLog("purchase.create", { purchaseId: id, materialId: input.materialId, qty: input.quantity });
  res.status(201).json({ id, unitCost, reused: false });
}));

// ── Cost approval / history ─────────────────────────────────────────────────

const proposeCostSchema = z.object({
  materialId: idSchema,
  costBasis: z.enum(["purchase_batch", "verified_manual_standard"]),
  purchaseId: idSchema.optional().nullable(),
  unitCost: moneySchema.nullable(),           // null = unknown, 0 = verified free
  reason: z.string().min(3).max(1000),
  evidenceUrl: z.string().url().max(1000).optional().nullable(),
  effectiveDate: z.string().datetime().optional().nullable(),
});

router.get("/materials/:id/costs", readLimiter, wrap(async (req, res) => {
  const id = idSchema.parse(req.params.id);
  res.json({
    current: await getApprovedCost(db(), id),
    history: await getMaterialCostHistory(db(), id),
  });
}));

router.post("/materials/:id/costs", writeLimiter, wrap(async (req, res) => {
  const materialId = idSchema.parse(req.params.id);
  const input = proposeCostSchema.parse({ ...(req.body ?? {}), materialId });
  const actor = actorFromRequest(req);
  const record = await proposeMaterialCost(db(), {
    ...input,
    effectiveDate: input.effectiveDate ? new Date(input.effectiveDate) : null,
    createdBy: actor.id,
  });
  await recordFinancialChange(db() as never, {
    entityType: "fulfillment_cost_record", entityId: record.id, action: "create",
    newValue: { materialId, unitCost: record.unitCost, basis: record.costBasis },
    reason: input.reason, performedBy: actor.id, performedByName: actor.name,
  });
  auditLog("cost.propose", { materialId, recordId: record.id, by: actor.id });
  res.status(201).json({ record });
}));

router.post("/cost-records/:id/approve", writeLimiter, wrap(async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const note = z.string().max(1000).optional().parse(req.body?.approvalNote);
  const actor = actorFromRequest(req);
  if (!actor.id) { res.status(403).json({ error: "لا يمكن اعتماد كلفة بدون هوية معتمِد" }); return; }

  const { record, supersededId } = await approveMaterialCost(db(), {
    costRecordId: id, approvedBy: actor.id, approvalNote: note ?? null,
  });
  await recordFinancialChange(db() as never, {
    entityType: "fulfillment_cost_record", entityId: id, action: "status_change",
    oldValue: { supersededRecordId: supersededId },
    newValue: { approvalStatus: "approved", unitCost: record.unitCost },
    reason: record.reason, performedBy: actor.id, performedByName: actor.name,
  });
  auditLog("cost.approve", { recordId: id, materialId: record.materialId, supersededId, by: actor.id });
  res.json({ record, supersededId });
}));

router.post("/cost-records/:id/reject", writeLimiter, wrap(async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const actor = actorFromRequest(req);
  if (!actor.id) { res.status(403).json({ error: "هوية غير معروفة" }); return; }
  const record = await rejectMaterialCost(db(), id, actor.id);
  await recordFinancialChange(db() as never, {
    entityType: "fulfillment_cost_record", entityId: id, action: "status_change",
    newValue: { approvalStatus: "rejected" }, performedBy: actor.id, performedByName: actor.name,
  });
  res.json({ record });
}));

// ── Stock balance and movements ─────────────────────────────────────────────

router.get("/materials/:id/stock", readLimiter, wrap(async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const movements = await db().select().from(packagingInventoryMovements)
    .where(eq(packagingInventoryMovements.materialId, id))
    .orderBy(desc(packagingInventoryMovements.createdAt));
  // Balance is DERIVED from the immutable ledger — there is no counter to drift.
  const balance = movements.reduce((sum, m) => sum + Number(m.quantity), 0);
  res.json({
    materialId: id, balance,
    movements: movements.map((m) => ({
      id: m.id, movementType: m.movementType, quantity: Number(m.quantity),
      orderId: m.orderId, eventId: m.eventId, purchaseId: m.purchaseId,
      reversalOfMovementId: m.reversalOfMovementId,
      recordedBy: m.recordedBy, createdAt: m.createdAt,
    })),
  });
}));

// ═════════════════════════════════════════════════════════════════════════════
// PROFILE FAMILIES AND VERSIONS
// ═════════════════════════════════════════════════════════════════════════════

const profileItemsSchema = z.array(z.object({
  materialId: idSchema, quantity: quantitySchema,
})).min(1).max(50);

router.get("/profile-families", readLimiter, wrap(async (req, res) => {
  res.json({ families: await listProfileFamilies(db(), { includeInactive: req.query.includeInactive === "true" }) });
}));

router.get("/profile-families/:id", readLimiter, wrap(async (req, res) => {
  const family = await getProfileFamily(db(), idSchema.parse(req.params.id));
  if (!family) { res.status(404).json({ error: "PROFILE_FAMILY_NOT_FOUND" }); return; }
  res.json(family);
}));

router.post("/profile-families", writeLimiter, wrap(async (req, res) => {
  const input = z.object({
    familyKey: z.string().min(1).max(100),
    name: z.string().min(1).max(200),
    appliesTo: z.record(z.string(), z.unknown()).optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
    items: profileItemsSchema,
    creationReason: z.string().max(500).optional().nullable(),
  }).parse(req.body ?? {});
  const actor = actorFromRequest(req);
  const result = await createProfileFamily(db(), { ...input, createdBy: actor.id });
  await recordFinancialChange(db() as never, {
    entityType: "packaging_profile", entityId: result.version.id, action: "create",
    newValue: { familyId: result.family.id, version: 1, items: input.items },
    reason: input.creationReason ?? "initial version",
    performedBy: actor.id, performedByName: actor.name,
  });
  auditLog("profile.family.create", { familyId: result.family.id, versionId: result.version.id });
  res.status(201).json(result);
}));

router.post("/profile-families/:id/versions", writeLimiter, wrap(async (req, res) => {
  const familyId = idSchema.parse(req.params.id);
  const input = z.object({
    items: profileItemsSchema,
    creationReason: z.string().min(3).max(500),
    name: z.string().min(1).max(200).optional(),
    appliesTo: z.record(z.string(), z.unknown()).optional().nullable(),
  }).parse(req.body ?? {});
  const actor = actorFromRequest(req);
  // "Editing" a profile is always a NEW version — the old one is never mutated.
  const version = await createProfileVersion(db(), { familyId, ...input, createdBy: actor.id });
  await recordFinancialChange(db() as never, {
    entityType: "packaging_profile", entityId: version.id, action: "create",
    newValue: { familyId, version: version.version, previousVersionId: version.previousVersionId },
    reason: input.creationReason, performedBy: actor.id, performedByName: actor.name,
  });
  auditLog("profile.version.create", { familyId, versionId: version.id, version: version.version });
  res.status(201).json({ version });
}));

router.post("/profile-versions/:id/active", writeLimiter, wrap(async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const active = z.boolean().parse(req.body?.active);
  const actor = actorFromRequest(req);
  const version = await setProfileVersionActive(db(), id, active);
  await recordFinancialChange(db() as never, {
    entityType: "packaging_profile", entityId: id, action: "status_change",
    newValue: { active }, performedBy: actor.id, performedByName: actor.name,
  });
  res.json({ version });
}));

router.post("/profile-families/:id/active", writeLimiter, wrap(async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const active = z.boolean().parse(req.body?.active);
  res.json({ family: await setFamilyActive(db(), id, active) });
}));

router.post("/profile-versions/expected-cost", readLimiter, wrap(async (req, res) => {
  const items = profileItemsSchema.parse(req.body?.items);
  // Calculated by the canonical service, from APPROVED costs only.
  res.json(await calculateExpectedCost(db(), items));
}));

router.get("/profile-versions/:id/usage", readLimiter, wrap(async (req, res) => {
  res.json({ usage: await getProfileVersionUsage(db(), idSchema.parse(req.params.id)) });
}));

// ═════════════════════════════════════════════════════════════════════════════
// DRAFT PREPARATION
// ═════════════════════════════════════════════════════════════════════════════

const suggestionContextSchema = z.object({
  categories: z.array(z.string().max(60)).max(30).optional(),
  itemCount: z.number().int().min(0).max(1000).optional(),
  fragile: z.boolean().optional(),
}).optional();

router.post("/orders/:orderId/suggestion", readLimiter, wrap(async (req, res) => {
  const context = suggestionContextSchema.parse(req.body?.context) ?? {};
  res.json({ suggestion: await suggestProfileForOrder(db(), context) });
}));

router.get("/orders/:orderId/drafts", readLimiter, wrap(async (req, res) => {
  res.json({ drafts: await listOrderDrafts(db(), idSchema.parse(req.params.orderId)) });
}));

router.post("/orders/:orderId/draft", writeLimiter, wrap(async (req, res) => {
  const orderId = idSchema.parse(req.params.orderId);
  const input = z.object({
    eventType: z.enum(FULFILLMENT_EVENT_TYPES as unknown as [string, ...string[]]).optional(),
    manualOnly: z.boolean().optional(),
    context: suggestionContextSchema,
  }).parse(req.body ?? {});
  const actor = actorFromRequest(req);
  const draft = await getOrCreateDraft(db(), {
    orderId,
    eventType: input.eventType as never,
    manualOnly: input.manualOnly,
    suggestionContext: input.context,
    createdBy: actor.id,
  });
  auditLog("draft.open", { orderId, draftId: draft.id, state: draft.state });
  res.json({ draft });
}));

router.get("/drafts/:id", readLimiter, wrap(async (req, res) => {
  res.json({ draft: await getDraft(db(), idSchema.parse(req.params.id)) });
}));

router.post("/drafts/:id/lines/catalog", writeLimiter, wrap(async (req, res) => {
  const draftId = idSchema.parse(req.params.id);
  const input = z.object({
    materialId: idSchema, quantity: quantitySchema,
    note: z.string().max(500).optional().nullable(),
  }).parse(req.body ?? {});
  res.json({ draft: await addCatalogLine(db(), { draftId, ...input }) });
}));

router.post("/drafts/:id/lines/manual", writeLimiter, wrap(async (req, res) => {
  const draftId = idSchema.parse(req.params.id);
  const input = z.object({
    materialName: z.string().min(1).max(200),
    category: z.enum(MANUAL_LINE_CATEGORIES as unknown as [string, ...string[]]),
    description: z.string().max(500).optional().nullable(),
    quantity: quantitySchema,
    unit: z.string().max(30).optional().nullable(),
    unitCost: moneySchema.nullable(),        // null = unknown; the total is server-side
    note: z.string().max(500).optional().nullable(),
  }).parse(req.body ?? {});
  res.json({ draft: await addManualLine(db(), { draftId, ...input, category: input.category as never }) });
}));

router.patch("/drafts/:id/lines/:lineId", writeLimiter, wrap(async (req, res) => {
  const draftId = idSchema.parse(req.params.id);
  const lineId = idSchema.parse(req.params.lineId);
  const input = z.object({
    quantity: quantitySchema.optional(),
    unitCost: moneySchema.nullable().optional(),
    note: z.string().max(500).nullable().optional(),
    description: z.string().max(500).nullable().optional(),
  }).parse(req.body ?? {});
  res.json({ draft: await updateDraftLine(db(), { draftId, lineId, ...input }) });
}));

router.delete("/drafts/:id/lines/:lineId", writeLimiter, wrap(async (req, res) => {
  res.json({
    draft: await removeDraftLine(db(), idSchema.parse(req.params.id), idSchema.parse(req.params.lineId)),
  });
}));

router.post("/drafts/:id/await-confirmation", writeLimiter, wrap(async (req, res) => {
  res.json({ draft: await markAwaitingConfirmation(db(), idSchema.parse(req.params.id)) });
}));

router.post("/drafts/:id/discard", writeLimiter, wrap(async (req, res) => {
  res.json({ draft: await discardDraft(db(), idSchema.parse(req.params.id)) });
}));

/**
 * Reject a retired negative-stock override instead of ignoring it.
 *
 * Zod strips unknown keys silently, so an old client (a cached bundle, a saved
 * cURL, a script) could keep sending `allowNegativeStock: true` and receive a
 * 200 while the flag did nothing. That reads as "the override still works" to
 * whoever is watching, which is worse than a hard failure. Callers must learn
 * the capability is gone.
 */
function rejectStockOverride(body: unknown): void {
  if (body && typeof body === "object" && "allowNegativeStock" in body) {
    // Mapped to 400 through DOMAIN_ERROR_STATUS, like every other domain error.
    throw new Error(
      "STOCK_OVERRIDE_REMOVED: negative packaging stock is not permitted; restock the material instead",
    );
  }
}

router.post("/drafts/:id/confirm", writeLimiter, wrap(async (req, res) => {
  const draftId = idSchema.parse(req.params.id);
  rejectStockOverride(req.body);
  const input = z.object({
    varianceReason: z.string().max(1000).optional(),
  }).parse(req.body ?? {});
  const actor = actorFromRequest(req);
  const result = await confirmDraft(db(), { draftId, recordedBy: actor.id ?? undefined, ...input });
  if (!result.alreadyConfirmed) {
    await recordFinancialChange(db() as never, {
      entityType: "fulfillment_event", entityId: result.eventId, action: "create",
      newValue: {
        draftId, actualCost: result.actualCost, expectedCost: result.expectedCost,
        variance: result.variance, costStatus: result.costStatus,
      },
      reason: input.varianceReason ?? null,
      performedBy: actor.id, performedByName: actor.name,
    });
  }
  auditLog("draft.confirm", {
    draftId, eventId: result.eventId, reused: String(result.alreadyConfirmed),
    actualCost: result.actualCost, status: result.costStatus,
  });
  res.status(result.alreadyConfirmed ? 200 : 201).json(result);
}));

// ═════════════════════════════════════════════════════════════════════════════
// CONFIRMATION / EVENTS
// ═════════════════════════════════════════════════════════════════════════════

const lineSchema = z.object({
  materialId: idSchema.nullable(),
  materialName: z.string().min(1).max(200),
  quantity: quantitySchema,
  unitCost: moneySchema.nullable(),           // null = unknown, never coerced to 0
  category: z.string().max(50).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  unit: z.string().max(30).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
});

const confirmSchema = z.object({
  eventType: z.enum(FULFILLMENT_EVENT_TYPES as unknown as [string, ...string[]]).optional(),
  requestId: idempotencySchema,               // idempotency
  profileFamilyId: idSchema.nullable().optional(),
  profileId: idSchema.nullable().optional(),
  profileVersion: z.number().int().positive().nullable().optional(),
  parentEventId: idSchema.nullable().optional(),
  expectedCost: moneySchema.nullable().optional(),
  lines: z.array(lineSchema).min(1).max(100),
  varianceReason: z.string().max(1000).optional(),
  adjustmentReason: z.string().max(1000).optional(),
});

/**
 * Direct confirmation for every event type: original shipment, reshipment,
 * replacement, return handling and adjustment. The draft flow above is the
 * owner-facing path; this is the programmatic one. Both land in the SAME
 * canonical service, so they cannot diverge.
 */
router.post("/orders/:orderId/events", writeLimiter, wrap(async (req, res) => {
  const orderId = idSchema.parse(req.params.orderId);
  rejectStockOverride(req.body);
  const input = confirmSchema.parse(req.body ?? {});
  const actor = actorFromRequest(req);

  const result = await confirmFulfillment(db(), {
    orderId,
    eventType: (input.eventType ?? "original") as never,
    requestId: input.requestId,
    profileFamilyId: input.profileFamilyId ?? null,
    profileId: input.profileId ?? null,
    profileVersion: input.profileVersion ?? null,
    parentEventId: input.parentEventId ?? null,
    expectedCost: input.expectedCost ?? null,
    lines: input.lines.map((l) => ({ ...l, source: l.materialId ? "catalog" : "manual" })),
    recordedBy: actor.id ?? undefined,
    varianceReason: input.varianceReason,
    adjustmentReason: input.adjustmentReason,
  });

  if (!result.reused) {
    await recordFinancialChange(db() as never, {
      entityType: "fulfillment_event", entityId: result.eventId, action: "create",
      newValue: {
        orderId, eventType: input.eventType ?? "original", sequenceNumber: result.sequenceNumber,
        actualCost: result.actualCost, expectedCost: result.expectedCost,
        variance: result.variance, costStatus: result.costStatus,
      },
      reason: input.varianceReason ?? input.adjustmentReason ?? null,
      performedBy: actor.id, performedByName: actor.name,
    });
  }
  auditLog("event.confirm", {
    orderId, eventId: result.eventId, type: input.eventType ?? "original",
    seq: result.sequenceNumber, reused: String(result.reused), actualCost: result.actualCost,
  });
  res.status(result.reused ? 200 : 201).json(result);
}));

router.post("/events/:id/reverse", writeLimiter, wrap(async (req, res) => {
  const eventId = idSchema.parse(req.params.id);
  const reason = z.string().min(3).max(1000).parse(req.body?.reason);
  const actor = actorFromRequest(req);

  const result = await reverseFulfillmentEvent(db(), eventId, reason, actor.id ?? undefined);
  if (!result.reused) {
    await recordFinancialChange(db() as never, {
      entityType: "fulfillment_event", entityId: eventId, action: "status_change",
      oldValue: { workflowState: "confirmed" },
      newValue: { workflowState: "reversed", reversalEventId: result.reversalEventId },
      reason, performedBy: actor.id, performedByName: actor.name,
    });
  }
  auditLog("event.reverse", {
    eventId, reversalEventId: result.reversalEventId,
    reused: String(result.reused), movements: result.reversedMovements,
  });
  res.json(result);
}));

router.get("/orders/:orderId/events", readLimiter, wrap(async (req, res) => {
  res.json({ events: await getFulfillmentHistory(db(), idSchema.parse(req.params.orderId)) });
}));

// ═════════════════════════════════════════════════════════════════════════════
// PROFITABILITY — canonical breakdown, assembled by the accounting engine
// ═════════════════════════════════════════════════════════════════════════════

const directCostsSchema = z.object({
  courierCost: moneySchema.nullable().optional(),
  commissions: moneySchema.nullable().optional(),
  paymentFees: moneySchema.nullable().optional(),
  otherDirectCosts: moneySchema.nullable().optional(),
}).optional();

router.get("/orders/:orderId/profitability", readLimiter, wrap(async (req, res) => {
  const orderId = idSchema.parse(req.params.orderId);
  // NOTE: every number below comes from computeOrderCostBreakdown. This handler
  // performs no arithmetic of its own — deliberately.
  const breakdown = await computeOrderCostBreakdown(db() as never, orderId);
  if (!breakdown) { res.status(404).json({ error: "ORDER_NOT_FOUND" }); return; }
  res.json({ breakdown });
}));

router.post("/orders/:orderId/profitability", readLimiter, wrap(async (req, res) => {
  const orderId = idSchema.parse(req.params.orderId);
  const direct = directCostsSchema.parse(req.body?.directCosts) ?? {};
  const breakdown = await computeOrderCostBreakdown(db() as never, orderId, direct);
  if (!breakdown) { res.status(404).json({ error: "ORDER_NOT_FOUND" }); return; }
  res.json({ breakdown });
}));

/**
 * INDEPENDENT integrity verification. Read-only: it re-derives every invariant from
 * raw SQL rather than reusing the services, so a service bug cannot hide itself.
 * Returns 200 when all invariants hold and 409 when a critical one is violated.
 */
router.get("/verify", readLimiter, wrap(async (_req, res) => {
  const report = await verifyFulfillmentIntegrity(db());
  res.status(report.ok ? 200 : 409).json({ report });
}));

// Reference data the admin UI needs for the quick-entry form.
router.get("/reference", readLimiter, wrap(async (_req, res) => {
  res.json({
    manualCategories: MANUAL_LINE_CATEGORIES.map((c) => ({ value: c, label: MANUAL_LINE_CATEGORY_LABELS[c] })),
    eventTypes: FULFILLMENT_EVENT_TYPES,
  });
}));

export default router;
