// Drizzle tables for the carton planner (migrations 0041-0047).
//
// A separate module rather than more lines in schema.ts: these tables reference
// products / orders / order_fulfillment_* one way, so keeping them here avoids a
// circular import while still giving Drizzle real foreign keys.
//
// The carton COLUMNS live on fulfillment_materials in schema.ts, because a
// carton genuinely is a fulfillment material — purchased, costed, consumed and
// snapshotted through the same four subsystems.
import { sql } from "drizzle-orm";
import { pgTable, text, integer, boolean, timestamp, jsonb, numeric, index } from "drizzle-orm/pg-core";
import {
  fulfillmentMaterials,
  orderFulfillmentEvents,
  orderFulfillmentLines,
  orderReturnEvents,
  orders,
  products,
} from "./schema.js";

/**
 * Packed geometry, weight and stacking rules per product (or per variant).
 *
 * A side table rather than columns on `products`: variants live inside
 * products.variants JSONB and cannot each own a column, and `products` carries
 * financial-immutability triggers we would rather not widen.
 *
 * Every measurement is nullable. NULL means "not measured" and the planner
 * refuses to plan — a substituted zero would produce a confident wrong carton.
 */
export const productPackingData = pgTable("product_packing_data", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  productId: text("product_id").references(() => products.id).notNull(),
  variantId: text("variant_id"),

  packedHeightCm: numeric("packed_height_cm"),
  packedWidthCm: numeric("packed_width_cm"),
  packedDepthCm: numeric("packed_depth_cm"),
  packedWeightKg: numeric("packed_weight_kg"),

  rotationAllowed: boolean("rotation_allowed").notNull().default(true),
  mustStayUpright: boolean("must_stay_upright").notNull().default(false),

  fragile: boolean("fragile").notNull().default(false),
  compressible: boolean("compressible").notNull().default(false),
  // Safe default: nothing may be stacked on a product until stated otherwise.
  canSupportItemsAbove: boolean("can_support_items_above").notNull().default(false),
  maxSupportedWeightAboveKg: numeric("max_supported_weight_above_kg"),

  minimumSupportRatio: numeric("minimum_support_ratio"),
  maximumOverhangRatio: numeric("maximum_overhang_ratio"),
  requiresFullBaseSupport: boolean("requires_full_base_support").notNull().default(false),

  foldable: boolean("foldable").notNull().default(false),
  foldedHeightCm: numeric("folded_height_cm"),
  foldedWidthCm: numeric("folded_width_cm"),
  foldedDepthCm: numeric("folded_depth_cm"),

  safetyAllowanceCm: numeric("safety_allowance_cm"),
  requiresSeparateCarton: boolean("requires_separate_carton").notNull().default(false),
  maxQtyPerCarton: integer("max_qty_per_carton"),

  source: text("source"),
  importDraftId: text("import_draft_id"),
  measuredBy: text("measured_by"),
  measuredAt: timestamp("measured_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  productIdx: index("ppd_product_idx").on(t.productId),
}));

/**
 * A claim on carton stock, held apart from the immutable movement ledger.
 *
 *   on_hand   = SUM(packaging_inventory_movements.quantity)
 *   reserved  = SUM(carton_reservations.quantity) WHERE state = 'active'
 *   available = on_hand - reserved
 *
 * A reservation is not a movement: it is mutable and nothing physical has
 * happened yet. Writing it as a negative movement would make on-hand lie about
 * what is actually in the room.
 */
export const cartonReservations = pgTable("carton_reservations", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  orderId: text("order_id").references(() => orders.id).notNull(),
  materialId: text("material_id").references(() => fulfillmentMaterials.id).notNull(),
  quantity: numeric("quantity").notNull(),
  state: text("state").notNull().default("active"),
  planId: text("plan_id"),
  idempotencyKey: text("idempotency_key").notNull(),
  consumedEventId: text("consumed_event_id").references(() => orderFulfillmentEvents.id),
  releasedReason: text("released_reason"),
  reservedBy: text("reserved_by"),
  reservedAt: timestamp("reserved_at", { withTimezone: true }).notNull().defaultNow(),
  stateChangedAt: timestamp("state_changed_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  orderIdx: index("cres_order_idx").on(t.orderId),
}));

/**
 * A validated packing plan. Geometry is stored in the same integer millimetres
 * and grams the planner computes in, so a stored plan and a recomputed plan
 * compare exactly with no rounding step in between.
 *
 * `manual_pack_required` is a real state and deliberately NOT a validated safe
 * plan: it carries no reservation and no automatic consumption.
 */
export const orderPackingPlans = pgTable("order_packing_plans", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  orderId: text("order_id").references(() => orders.id).notNull(),
  state: text("state").notNull().default("proposed"),
  planHash: text("plan_hash"),
  engineVersion: text("engine_version"),
  cartonCount: integer("carton_count").notNull().default(0),
  totalKnownCost: numeric("total_known_cost"),
  costStatus: text("cost_status").notNull().default("incomplete"),
  validationReport: jsonb("validation_report"),
  explanationAr: text("explanation_ar"),
  manualReason: text("manual_reason"),
  supersededById: text("superseded_by_id"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  orderIdx: index("opp_order_idx").on(t.orderId),
}));

export const orderPackingPlanItems = pgTable("order_packing_plan_items", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  planId: text("plan_id").references(() => orderPackingPlans.id, { onDelete: "cascade" }).notNull(),
  cartonIndex: integer("carton_index").notNull(),
  materialId: text("material_id").references(() => fulfillmentMaterials.id),
  productId: text("product_id").notNull(),
  variantId: text("variant_id"),
  unitSeq: integer("unit_seq").notNull().default(1),
  productNameSnapshot: text("product_name_snapshot").notNull(),
  posXMm: integer("pos_x_mm").notNull(),
  posYMm: integer("pos_y_mm").notNull(),
  posZMm: integer("pos_z_mm").notNull(),
  dimXMm: integer("dim_x_mm").notNull(),
  dimYMm: integer("dim_y_mm").notNull(),
  dimZMm: integer("dim_z_mm").notNull(),
  rotationType: integer("rotation_type").notNull(),
  weightG: integer("weight_g").notNull(),
  supportRatioBp: integer("support_ratio_bp"),
  loadOnG: integer("load_on_g"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  planIdx: index("oppi_plan_idx").on(t.planId),
}));

/**
 * Admin carton low-stock alerts.
 *
 * Separate from notificationLog, whose userId is NOT NULL and references users —
 * that is the customer notification system, with push/email delivery paths.
 * Deduplication is a partial unique index on (material_id) WHERE state = 'open',
 * so the database guarantees one open alert per carton even under concurrency.
 */
export const adminStockAlerts = pgTable("admin_stock_alerts", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  materialId: text("material_id").references(() => fulfillmentMaterials.id).notNull(),
  alertLevel: text("alert_level").notNull(),
  state: text("state").notNull().default("open"),
  onHandSnapshot: numeric("on_hand_snapshot"),
  reservedSnapshot: numeric("reserved_snapshot"),
  availableSnapshot: numeric("available_snapshot"),
  thresholdSnapshot: numeric("threshold_snapshot"),
  messageAr: text("message_ar"),
  openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  acknowledgedBy: text("acknowledged_by"),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Return-loss classification for packaging.
 *
 * Not an inventory movement: the carton left stock at shipment and never comes
 * back, so nothing physical happens at return time. Not a fulfillment event
 * either: an event with no cost lines makes the whole order's packaging cost
 * read as incomplete.
 *
 * `isReclassificationOnly` is what keeps profit correct — the amount is shown as
 * a return loss and never added to an expense total, because it was already
 * recognised once at shipment.
 */
export const orderReturnPackagingLosses = pgTable("order_return_packaging_losses", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  orderId: text("order_id").references(() => orders.id).notNull(),
  returnEventId: text("return_event_id").references(() => orderReturnEvents.id),
  fulfillmentEventId: text("fulfillment_event_id").references(() => orderFulfillmentEvents.id).notNull(),
  fulfillmentLineId: text("fulfillment_line_id").references(() => orderFulfillmentLines.id),
  materialId: text("material_id").references(() => fulfillmentMaterials.id),
  materialNameSnapshot: text("material_name_snapshot").notNull(),
  quantity: numeric("quantity").notNull(),
  originalUnitCostSnapshot: numeric("original_unit_cost_snapshot"),
  originalTotalCostSnapshot: numeric("original_total_cost_snapshot"),
  originalCostStatus: text("original_cost_status").notNull(),
  lossCategory: text("loss_category").notNull().default("damaged_carton"),
  classificationMode: text("classification_mode").notNull().default("automatic"),
  isReclassificationOnly: boolean("is_reclassification_only").notNull().default(true),
  reason: text("reason").notNull(),
  recordedBy: text("recorded_by"),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  orderIdx: index("orpl_order_idx").on(t.orderId),
}));

/** Staging for the owner's measurement spreadsheet. Nothing is applied blind. */
export const packingImportDrafts = pgTable("packing_import_drafts", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  fileName: text("file_name").notNull(),
  fileHash: text("file_hash"),
  sheetName: text("sheet_name"),
  rowCount: integer("row_count").notNull().default(0),
  state: text("state").notNull().default("draft"),
  importedBy: text("imported_by"),
  appliedAt: timestamp("applied_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const packingImportDraftLines = pgTable("packing_import_draft_lines", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  draftId: text("draft_id").references(() => packingImportDrafts.id, { onDelete: "cascade" }).notNull(),
  rowNumber: integer("row_number").notNull(),
  // Raw cells kept verbatim so a mapping question can be settled against what
  // the sheet actually said.
  rawProductName: text("raw_product_name").notNull(),
  rawPieceCount: text("raw_piece_count"),
  rawHeight: text("raw_height"),
  rawWidth: text("raw_width"),
  rawFoldable: text("raw_foldable"),
  packedHeightCm: numeric("packed_height_cm"),
  packedWidthCm: numeric("packed_width_cm"),
  foldable: boolean("foldable"),
  matchedProductId: text("matched_product_id").references(() => products.id),
  matchConfidence: text("match_confidence").notNull().default("ambiguous"),
  matchCandidates: jsonb("match_candidates"),
  confirmedBy: text("confirmed_by"),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  applied: boolean("applied").notNull().default(false),
  parseWarnings: jsonb("parse_warnings"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  draftIdx: index("pidl_draft_idx").on(t.draftId),
}));

export type ProductPackingData = typeof productPackingData.$inferSelect;
export type InsertProductPackingData = typeof productPackingData.$inferInsert;
export type CartonReservation = typeof cartonReservations.$inferSelect;
export type OrderPackingPlan = typeof orderPackingPlans.$inferSelect;
export type OrderPackingPlanItem = typeof orderPackingPlanItems.$inferSelect;
export type AdminStockAlert = typeof adminStockAlerts.$inferSelect;
export type OrderReturnPackagingLoss = typeof orderReturnPackagingLosses.$inferSelect;
export type PackingImportDraft = typeof packingImportDrafts.$inferSelect;
export type PackingImportDraftLine = typeof packingImportDraftLines.$inferSelect;
