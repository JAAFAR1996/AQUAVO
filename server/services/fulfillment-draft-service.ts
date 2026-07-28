// ─────────────────────────────────────────────────────────────────────────────
// Preparation DRAFTS (items 4 + 8).
//
// A draft is a MUTABLE working document, not an accounting event. While it exists
// it has ZERO effect on order profit, fulfillment totals, packaging stock and
// financial reports — nothing reads draft tables except this service and the admin
// screen. Draft lines live in their OWN tables; they are never written into the
// immutable confirmed-lines table.
//
// Workflow:  suggested → editing (owner edits / adds catalog + named manual lines)
//            → awaiting_confirmation → CONFIRMED
// Confirmation converts the draft into exactly ONE immutable event inside a single
// transaction and marks the draft consumed. Afterwards:
//   * repeating the confirmation returns the SAME event (idempotent);
//   * draft edits are rejected (service + DB trigger);
//   * stock is deducted exactly once.
// ─────────────────────────────────────────────────────────────────────────────
import { randomUUID } from "node:crypto";
import { eq, and, inArray, desc, sql } from "drizzle-orm";
import { getDb } from "../db.js";
import {
  fulfillmentPreparationDrafts, fulfillmentPreparationDraftLines,
  fulfillmentMaterials, orderFulfillmentEvents, packagingInventoryMovements,
} from "../../shared/schema.js";
import { toMoneyOrNull } from "../../shared/order-financials.js";
import type {
  FulfillmentDb, DraftRow, DraftLineRow, EventRow,
} from "./fulfillment-db.js";
import { getApprovedCosts } from "./material-cost-service.js";
import { lockProfileVersion, suggestProfileForOrder } from "./packaging-profile-service.js";
import {
  confirmFulfillment, type ConfirmResult, type FulfillmentEventType, type LineInput,
} from "./fulfillment-service.js";

export type DraftState = "suggested" | "editing" | "awaiting_confirmation" | "consumed" | "discarded";
const OPEN_STATES: DraftState[] = ["suggested", "editing", "awaiting_confirmation"];

/** Quick-entry categories the owner actually uses. */
export const MANUAL_LINE_CATEGORIES = [
  "box",        // صندوق
  "sticker",    // ستكرات
  "card",       // كارت
  "tape",       // تيب
  "wrap",       // تغليف
  "extra",      // تكلفة إضافية
  "other",
] as const;
export type ManualLineCategory = (typeof MANUAL_LINE_CATEGORIES)[number];

export const MANUAL_LINE_CATEGORY_LABELS: Record<ManualLineCategory, string> = {
  box: "صندوق", sticker: "ستكرات", card: "كارت", tape: "تيب",
  wrap: "تغليف", extra: "تكلفة إضافية", other: "غير ذلك",
};

function requireDb(dbArg?: FulfillmentDb): FulfillmentDb {
  const db = dbArg ?? (getDb() as FulfillmentDb | null);
  if (!db) throw new Error("Database not available");
  return db;
}

export interface DraftLineView {
  id: string;
  materialId: string | null;
  materialName: string;
  category: string | null;
  description: string | null;
  quantity: number;
  unit: string | null;
  unitCost: number | null;      // null = unknown, NEVER 0
  totalCost: number | null;     // server-calculated
  costStatus: "exact" | "unknown";
  source: string;
  note: string | null;
}

export interface DraftView {
  id: string;
  orderId: string;
  eventType: FulfillmentEventType;
  state: DraftState;
  profileFamilyId: string | null;
  profileId: string | null;
  profileVersion: number | null;
  suggestionReason: string | null;
  lines: DraftLineView[];
  /** Server-calculated. NULL when any line's cost is unknown — never coerced to 0. */
  expectedCost: number | null;
  knownCostSubtotal: number;    // sum over KNOWN lines only, clearly labelled as partial
  costStatus: "exact" | "incomplete" | "unknown";
  missingCostLines: string[];   // names of lines whose unit cost is unknown
  /**
   * Stock sufficiency, computed HERE so the admin screen can warn BEFORE the owner
   * presses confirm, instead of only after a rejected attempt. The client must not
   * derive this by comparing catalog balances against line quantities itself.
   * Confirmation re-checks inside its transaction — this is advisory, not the guard.
   */
  stock: {
    wouldGoNegative: boolean;
    shortages: Array<{ materialId: string; materialName: string; available: number; required: number }>;
  };
  confirmedEventId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Server-side cost calculation (the ONLY place draft totals are computed) ───

/** Compute a draft's totals. One unknown unit cost ⇒ expectedCost is NULL. */
export function calculateDraftCost(lines: DraftLineView[]): {
  expectedCost: number | null; knownCostSubtotal: number;
  costStatus: "exact" | "incomplete" | "unknown"; missingCostLines: string[];
} {
  if (lines.length === 0) {
    return { expectedCost: null, knownCostSubtotal: 0, costStatus: "unknown", missingCostLines: [] };
  }
  let known = 0;
  const missing: string[] = [];
  for (const l of lines) {
    if (l.totalCost == null) missing.push(l.materialName);
    else known += l.totalCost;
  }
  return {
    expectedCost: missing.length ? null : known,
    knownCostSubtotal: known,
    costStatus: missing.length ? "incomplete" : "exact",
    missingCostLines: missing,
  };
}

function toLineView(row: DraftLineRow): DraftLineView {
  const unitCost = toMoneyOrNull(row.unitCost);
  const qty = Number(row.quantity);
  const known = unitCost != null && Number.isFinite(qty);
  return {
    id: row.id, materialId: row.materialId, materialName: row.materialName,
    category: row.category, description: row.description, quantity: qty, unit: row.unit,
    unitCost, totalCost: known ? unitCost! * qty : null,
    costStatus: known ? "exact" : "unknown",
    source: row.source, note: row.note,
  };
}

async function buildView(db: FulfillmentDb, draft: DraftRow): Promise<DraftView> {
  const rows = await db.select().from(fulfillmentPreparationDraftLines)
    .where(eq(fulfillmentPreparationDraftLines.draftId, draft.id))
    .orderBy(fulfillmentPreparationDraftLines.createdAt);
  const lines = rows.map(toLineView);
  const totals = calculateDraftCost(lines);
  const stock = draft.state === "consumed"
    ? { wouldGoNegative: false, shortages: [] }   // already committed; nothing left to warn about
    : await projectStock(db, lines);
  return {
    id: draft.id, orderId: draft.orderId, eventType: draft.eventType as FulfillmentEventType,
    state: draft.state as DraftState,
    profileFamilyId: draft.profileFamilyId, profileId: draft.profileId,
    profileVersion: draft.profileVersion, suggestionReason: draft.suggestionReason,
    lines, ...totals, stock,
    confirmedEventId: draft.confirmedEventId,
    createdAt: new Date(draft.createdAt).toISOString(),
    updatedAt: new Date(draft.updatedAt).toISOString(),
  };
}

/**
 * Project the ledger balance of every catalog material this draft would consume.
 * Read-only and advisory: confirmation re-checks inside its own transaction, which
 * is where the real guard lives. Manual lines carry no material and never affect stock.
 * Several lines may cite the SAME material — their quantities are summed, so a
 * draft that splits one material across two lines is judged on the total.
 */
async function projectStock(db: FulfillmentDb, lines: DraftLineView[]): Promise<DraftView["stock"]> {
  const required = new Map<string, { name: string; qty: number }>();
  for (const l of lines) {
    if (!l.materialId) continue;
    const cur = required.get(l.materialId);
    required.set(l.materialId, {
      name: l.materialName,
      qty: (cur?.qty ?? 0) + Math.abs(Number(l.quantity) || 0),
    });
  }
  if (required.size === 0) return { wouldGoNegative: false, shortages: [] };

  const shortages: DraftView["stock"]["shortages"] = [];
  for (const [materialId, { name, qty }] of required) {
    const [row] = await db
      .select({ bal: sql<string>`COALESCE(SUM(${packagingInventoryMovements.quantity}), 0)` })
      .from(packagingInventoryMovements)
      .where(eq(packagingInventoryMovements.materialId, materialId));
    const available = Number(row?.bal ?? 0);
    if (available - qty < 0) {
      shortages.push({ materialId, materialName: name, available, required: qty });
    }
  }
  return { wouldGoNegative: shortages.length > 0, shortages };
}

async function loadDraftRow(db: FulfillmentDb, draftId: string): Promise<DraftRow> {
  const [row] = await db.select().from(fulfillmentPreparationDrafts)
    .where(eq(fulfillmentPreparationDrafts.id, draftId)).limit(1);
  if (!row) throw new Error("DRAFT_NOT_FOUND");
  return row;
}

function assertEditable(draft: DraftRow): void {
  if (draft.state === "consumed") {
    throw new Error("DRAFT_CONSUMED: this draft was already confirmed and is frozen");
  }
  if (draft.state === "discarded") throw new Error("DRAFT_DISCARDED: this draft was discarded");
}

// ── Create / load ────────────────────────────────────────────────────────────

export interface CreateDraftInput {
  orderId: string;
  eventType?: FulfillmentEventType;
  createdBy?: string | null;
  /** Order context used to pick a suggested profile. */
  suggestionContext?: { categories?: string[]; itemCount?: number; fragile?: boolean };
  /** Skip the profile suggestion and start from an empty manual draft. */
  manualOnly?: boolean;
}

/**
 * Get the OPEN draft for (order, eventType) or create one. Creating seeds the draft
 * from the suggested profile version (with its reason) when one matches.
 */
export async function getOrCreateDraft(
  dbArg: FulfillmentDb | undefined,
  input: CreateDraftInput,
): Promise<DraftView> {
  const db = requireDb(dbArg);
  const eventType: FulfillmentEventType = input.eventType ?? "original";

  const open = await db.select().from(fulfillmentPreparationDrafts).where(and(
    eq(fulfillmentPreparationDrafts.orderId, input.orderId),
    eq(fulfillmentPreparationDrafts.eventType, eventType),
    inArray(fulfillmentPreparationDrafts.state, OPEN_STATES),
  )).limit(1);
  if (open[0]) return buildView(db, open[0]);

  const suggestion = input.manualOnly
    ? null
    : await suggestProfileForOrder(db, input.suggestionContext ?? {});

  const draftId = randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(fulfillmentPreparationDrafts).values({
      id: draftId, orderId: input.orderId, eventType,
      state: suggestion ? "suggested" : "editing",
      profileFamilyId: suggestion?.familyId ?? null,
      profileId: suggestion?.profileId ?? null,
      profileVersion: suggestion?.version ?? null,
      suggestionReason: suggestion?.reason ?? null,
      expectedCost: suggestion?.expectedCost == null ? null : String(suggestion.expectedCost),
      costStatus: suggestion ? (suggestion.expectedCost == null ? "incomplete" : "exact") : "unknown",
      createdBy: input.createdBy ?? null,
    });
    for (const item of suggestion?.items ?? []) {
      await tx.insert(fulfillmentPreparationDraftLines).values({
        id: randomUUID(), draftId, materialId: item.materialId,
        materialName: item.materialName ?? item.materialId,
        quantity: String(item.quantity),
        unitCost: item.unitCost == null ? null : String(item.unitCost),
        costStatus: item.unitCost == null ? "unknown" : "exact",
        source: "profile",
      });
    }
  });

  return buildView(db, await loadDraftRow(db, draftId));
}

export async function getDraft(dbArg: FulfillmentDb | undefined, draftId: string): Promise<DraftView> {
  const db = requireDb(dbArg);
  return buildView(db, await loadDraftRow(db, draftId));
}

export async function listOrderDrafts(
  dbArg: FulfillmentDb | undefined,
  orderId: string,
): Promise<DraftView[]> {
  const db = requireDb(dbArg);
  const rows = await db.select().from(fulfillmentPreparationDrafts)
    .where(eq(fulfillmentPreparationDrafts.orderId, orderId))
    .orderBy(desc(fulfillmentPreparationDrafts.createdAt));
  const out: DraftView[] = [];
  for (const r of rows) out.push(await buildView(db, r));
  return out;
}

// ── Edit ─────────────────────────────────────────────────────────────────────

export interface AddCatalogLineInput { draftId: string; materialId: string; quantity: number; note?: string | null }

/** Add a catalog material. Its unit cost is taken from the APPROVED cost record. */
export async function addCatalogLine(
  dbArg: FulfillmentDb | undefined,
  input: AddCatalogLineInput,
): Promise<DraftView> {
  const db = requireDb(dbArg);
  const draft = await loadDraftRow(db, input.draftId);
  assertEditable(draft);
  if (!(Number(input.quantity) > 0)) throw new Error("QUANTITY_INVALID: quantity must be > 0");

  const [material] = await db.select().from(fulfillmentMaterials)
    .where(eq(fulfillmentMaterials.id, input.materialId)).limit(1);
  if (!material) throw new Error("MATERIAL_NOT_FOUND");
  if (!material.active) throw new Error("MATERIAL_INACTIVE: this material has been deactivated");

  const costs = await getApprovedCosts(db, [input.materialId]);
  const unitCost = costs.get(input.materialId)?.unitCost ?? null;

  await db.insert(fulfillmentPreparationDraftLines).values({
    id: randomUUID(), draftId: input.draftId, materialId: input.materialId,
    materialName: material.name, category: material.category, unit: material.unit,
    quantity: String(input.quantity),
    unitCost: unitCost == null ? null : String(unitCost),
    costStatus: unitCost == null ? "unknown" : "exact",
    source: "catalog", note: input.note ?? null,
  });
  await touchDraft(db, input.draftId);
  return buildView(db, await loadDraftRow(db, input.draftId));
}

export interface AddManualLineInput {
  draftId: string;
  materialName: string;              // e.g. "صندوق"
  category: ManualLineCategory;
  description?: string | null;
  quantity: number;
  unit?: string | null;
  /** null = unknown cost (stays unknown). 0 is accepted only as a deliberate free line. */
  unitCost: number | null;
  note?: string | null;
}

/**
 * Add a NAMED manual line (item 8). Every manual cost is itemized: category,
 * description, quantity, unit, unit cost, server-calculated total, cost status and
 * note. A single unexplained lump-sum "packaging cost" is not representable here —
 * there is no field for it.
 */
export async function addManualLine(
  dbArg: FulfillmentDb | undefined,
  input: AddManualLineInput,
): Promise<DraftView> {
  const db = requireDb(dbArg);
  const draft = await loadDraftRow(db, input.draftId);
  assertEditable(draft);
  if (!input.materialName?.trim()) throw new Error("LINE_NAME_REQUIRED: a manual line must be named");
  if (!MANUAL_LINE_CATEGORIES.includes(input.category)) throw new Error("CATEGORY_INVALID");
  if (!(Number(input.quantity) > 0)) throw new Error("QUANTITY_INVALID: quantity must be > 0");
  const unitCost = toMoneyOrNull(input.unitCost);
  if (unitCost != null && unitCost < 0) throw new Error("NEGATIVE_COST");

  await db.insert(fulfillmentPreparationDraftLines).values({
    id: randomUUID(), draftId: input.draftId, materialId: null,
    materialName: input.materialName.trim(), category: input.category,
    description: input.description ?? null, quantity: String(input.quantity),
    unit: input.unit ?? null,
    unitCost: unitCost == null ? null : String(unitCost),
    costStatus: unitCost == null ? "unknown" : "exact",
    source: "manual", note: input.note ?? null,
  });
  await touchDraft(db, input.draftId);
  return buildView(db, await loadDraftRow(db, input.draftId));
}

export interface UpdateDraftLineInput {
  draftId: string; lineId: string;
  quantity?: number;
  unitCost?: number | null;
  note?: string | null;
  description?: string | null;
}

/** Edit a draft line (quantity / cost / note). Rejected once the draft is consumed. */
export async function updateDraftLine(
  dbArg: FulfillmentDb | undefined,
  input: UpdateDraftLineInput,
): Promise<DraftView> {
  const db = requireDb(dbArg);
  const draft = await loadDraftRow(db, input.draftId);
  assertEditable(draft);

  const patch: Partial<typeof fulfillmentPreparationDraftLines.$inferInsert> = { updatedAt: new Date() };
  if (input.quantity !== undefined) {
    if (!(Number(input.quantity) > 0)) throw new Error("QUANTITY_INVALID: quantity must be > 0");
    patch.quantity = String(input.quantity);
  }
  if (input.unitCost !== undefined) {
    const uc = toMoneyOrNull(input.unitCost);
    if (uc != null && uc < 0) throw new Error("NEGATIVE_COST");
    patch.unitCost = uc == null ? null : String(uc);
    patch.costStatus = uc == null ? "unknown" : "exact";
  }
  if (input.note !== undefined) patch.note = input.note;
  if (input.description !== undefined) patch.description = input.description;

  await db.update(fulfillmentPreparationDraftLines).set(patch).where(and(
    eq(fulfillmentPreparationDraftLines.id, input.lineId),
    eq(fulfillmentPreparationDraftLines.draftId, input.draftId),
  ));
  await touchDraft(db, input.draftId);
  return buildView(db, await loadDraftRow(db, input.draftId));
}

export async function removeDraftLine(
  dbArg: FulfillmentDb | undefined,
  draftId: string, lineId: string,
): Promise<DraftView> {
  const db = requireDb(dbArg);
  const draft = await loadDraftRow(db, draftId);
  assertEditable(draft);
  await db.delete(fulfillmentPreparationDraftLines).where(and(
    eq(fulfillmentPreparationDraftLines.id, lineId),
    eq(fulfillmentPreparationDraftLines.draftId, draftId),
  ));
  await touchDraft(db, draftId);
  return buildView(db, await loadDraftRow(db, draftId));
}

async function touchDraft(db: FulfillmentDb, draftId: string): Promise<void> {
  const rows = await db.select().from(fulfillmentPreparationDraftLines)
    .where(eq(fulfillmentPreparationDraftLines.draftId, draftId));
  const totals = calculateDraftCost(rows.map(toLineView));
  await db.update(fulfillmentPreparationDrafts).set({
    state: "editing",
    expectedCost: totals.expectedCost == null ? null : String(totals.expectedCost),
    costStatus: totals.costStatus,
    updatedAt: new Date(),
  }).where(and(
    eq(fulfillmentPreparationDrafts.id, draftId),
    inArray(fulfillmentPreparationDrafts.state, ["suggested", "editing", "awaiting_confirmation"]),
  ));
}

export async function markAwaitingConfirmation(
  dbArg: FulfillmentDb | undefined,
  draftId: string,
): Promise<DraftView> {
  const db = requireDb(dbArg);
  const draft = await loadDraftRow(db, draftId);
  assertEditable(draft);
  await db.update(fulfillmentPreparationDrafts)
    .set({ state: "awaiting_confirmation", updatedAt: new Date() })
    .where(eq(fulfillmentPreparationDrafts.id, draftId));
  return buildView(db, await loadDraftRow(db, draftId));
}

export async function discardDraft(
  dbArg: FulfillmentDb | undefined,
  draftId: string,
): Promise<DraftView> {
  const db = requireDb(dbArg);
  const draft = await loadDraftRow(db, draftId);
  assertEditable(draft);
  await db.update(fulfillmentPreparationDrafts)
    .set({ state: "discarded", updatedAt: new Date() })
    .where(eq(fulfillmentPreparationDrafts.id, draftId));
  return buildView(db, await loadDraftRow(db, draftId));
}

// ── Confirmation: draft → ONE immutable event ────────────────────────────────

export interface ConfirmDraftInput {
  draftId: string;
  recordedBy?: string;
  varianceReason?: string;
  allowNegativeStock?: boolean;
}

export interface ConfirmDraftResult extends ConfirmResult {
  draftId: string;
  /** true when the draft had already been confirmed and the SAME event was returned. */
  alreadyConfirmed: boolean;
}

/**
 * Convert a draft into exactly ONE immutable fulfillment event, transactionally.
 * Idempotent at two levels: the draft's own `confirmed_event_id`, and the event's
 * idempotency key (derived from the draft id) — so a repeated confirmation returns
 * the same event and never deducts stock twice.
 */
export async function confirmDraft(
  dbArg: FulfillmentDb | undefined,
  input: ConfirmDraftInput,
): Promise<ConfirmDraftResult> {
  const db = requireDb(dbArg);
  const draft = await loadDraftRow(db, input.draftId);

  // Already converted → return the SAME immutable event.
  if (draft.state === "consumed" && draft.confirmedEventId) {
    const [ev] = await db.select().from(orderFulfillmentEvents)
      .where(eq(orderFulfillmentEvents.id, draft.confirmedEventId)).limit(1);
    if (ev) return { ...eventToResult(ev), draftId: draft.id, alreadyConfirmed: true };
  }
  if (draft.state === "discarded") throw new Error("DRAFT_DISCARDED: a discarded draft cannot be confirmed");

  const view = await buildView(db, draft);
  if (view.lines.length === 0) {
    throw new Error("DRAFT_EMPTY: add at least one packaging line before confirming");
  }

  const lines: LineInput[] = view.lines.map((l) => ({
    materialId: l.materialId,
    materialName: l.materialName,
    quantity: l.quantity,
    unitCost: l.unitCost,
    source: (l.source === "profile" || l.source === "catalog" || l.source === "manual")
      ? l.source : "manual",
    category: l.category, description: l.description, unit: l.unit, note: l.note,
  }));

  // The draft id IS the request id — the confirmation of a given draft is one action.
  const result = await confirmFulfillment(db, {
    orderId: draft.orderId,
    eventType: draft.eventType as FulfillmentEventType,
    requestId: `draft:${draft.id}`,
    profileFamilyId: draft.profileFamilyId,
    profileId: draft.profileId,
    profileVersion: draft.profileVersion,
    draftId: draft.id,
    expectedCost: toMoneyOrNull(draft.expectedCost),
    lines,
    recordedBy: input.recordedBy,
    varianceReason: input.varianceReason,
    allowNegativeStock: input.allowNegativeStock,
  });

  // Mark consumed and lock the cited profile version so it can never be edited.
  await db.transaction(async (tx) => {
    await tx.update(fulfillmentPreparationDrafts).set({
      state: "consumed", confirmedEventId: result.eventId, consumedAt: new Date(), updatedAt: new Date(),
    }).where(and(
      eq(fulfillmentPreparationDrafts.id, draft.id),
      inArray(fulfillmentPreparationDrafts.state, ["suggested", "editing", "awaiting_confirmation"]),
    ));
    if (draft.profileId) await lockProfileVersion(tx, draft.profileId);
  });

  return { ...result, draftId: draft.id, alreadyConfirmed: result.reused };
}

function eventToResult(e: EventRow): ConfirmResult {
  return {
    eventId: e.id, reused: true, sequenceNumber: e.sequenceNumber,
    actualCost: toMoneyOrNull(e.actualCost), expectedCost: toMoneyOrNull(e.expectedCost),
    variance: toMoneyOrNull(e.variance),
    costStatus: e.costStatus as ConfirmResult["costStatus"],
  };
}
