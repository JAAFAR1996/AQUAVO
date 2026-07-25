import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  date,
  jsonb,
  numeric,
  index,
  uniqueIndex,
  check,
  primaryKey,
  foreignKey,
} from "drizzle-orm/pg-core";
import { products, orders } from "./schema.js";

const timestamptz = (name: string) => timestamp(name, { withTimezone: true });

export const dataSourceRegistry = pgTable("data_source_registry", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  domain: text("domain").notNull(),
  sourceName: text("source_name").notNull(),
  sourceKind: text("source_kind").notNull(),
  decisionStatus: text("decision_status").notNull(),
  allowedForAutomatedDecisions: boolean("allowed_for_automated_decisions").notNull().default(false),
  canonicalReplacement: text("canonical_replacement"),
  notes: text("notes"),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
  updatedAt: timestamptz("updated_at").notNull().defaultNow(),
}, (table) => ({
  identity: uniqueIndex("data_source_registry_unique").on(table.domain, table.sourceName),
  statusCheck: check("data_source_registry_status_check", sql`${table.decisionStatus} in ('canonical','reconciliation','legacy','prohibited')`),
}));

export const databaseRepairRuns = pgTable("database_repair_runs", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  planVersion: text("plan_version").notNull(),
  migrationName: text("migration_name").notNull(),
  environment: text("environment").notNull(),
  branchId: text("branch_id"),
  status: text("status").notNull().default("prepared"),
  startedAt: timestamptz("started_at").notNull().defaultNow(),
  completedAt: timestamptz("completed_at"),
  executedBy: text("executed_by"),
  migrationHash: text("migration_hash"),
  verificationSummary: jsonb("verification_summary").notNull().default({}),
  notes: text("notes"),
});

export const databaseRepairFindings = pgTable("database_repair_findings", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  repairRunId: text("repair_run_id").references(() => databaseRepairRuns.id),
  findingCode: text("finding_code").notNull(),
  severity: text("severity").notNull(),
  domain: text("domain").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  status: text("status").notNull().default("open"),
  observedValue: jsonb("observed_value"),
  proposedValue: jsonb("proposed_value"),
  evidence: jsonb("evidence").notNull().default({}),
  resolutionNotes: text("resolution_notes"),
  resolvedBy: text("resolved_by"),
  resolvedAt: timestamptz("resolved_at"),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
}, (table) => ({
  statusIdx: index("database_repair_findings_status_idx").on(table.status, table.severity, table.domain),
  identity: uniqueIndex("database_repair_findings_unique").on(table.findingCode, table.entityType, table.entityId),
}));

export const inventoryLegacySnapshots = pgTable("inventory_legacy_snapshots", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  sourceTable: text("source_table").notNull(),
  sourcePk: text("source_pk").notNull(),
  sourceHash: text("source_hash").notNull(),
  rowData: jsonb("row_data").notNull(),
  capturedAt: timestamptz("captured_at").notNull().defaultNow(),
  capturedBy: text("captured_by"),
}, (table) => ({
  identity: uniqueIndex("inventory_legacy_snapshots_unique").on(table.sourceTable, table.sourcePk, table.sourceHash),
}));

export const productVariantReconciliation = pgTable("product_variant_reconciliation", {
  productId: text("product_id").notNull().references(() => products.id),
  variantId: text("variant_id").notNull(),
  label: text("label").notNull(),
  sku: text("sku"),
  observedPrice: numeric("observed_price"),
  observedOriginalPrice: numeric("observed_original_price"),
  observedStock: integer("observed_stock"),
  approvedCanonicalStock: integer("approved_canonical_stock"),
  isDefault: boolean("is_default").notNull().default(false),
  specifications: jsonb("specifications").notNull().default({}),
  sourceSnapshot: jsonb("source_snapshot").notNull(),
  reconciliationStatus: text("reconciliation_status").notNull().default("pending"),
  reconciliationNotes: text("reconciliation_notes"),
  approvedBy: text("approved_by"),
  approvedAt: timestamptz("approved_at"),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
  updatedAt: timestamptz("updated_at").notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.productId, table.variantId] }),
  statusIdx: index("product_variant_reconciliation_status_idx").on(table.reconciliationStatus, table.productId),
  oneDefault: uniqueIndex("product_variant_one_default_idx").on(table.productId).where(sql`${table.isDefault} = true`),
}));

export const inventoryLocations = pgTable("inventory_locations", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  locationType: text("location_type").notNull().default("warehouse"),
  isActive: boolean("is_active").notNull().default(true),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
  updatedAt: timestamptz("updated_at").notNull().defaultNow(),
});

export const inventoryReconciliations = pgTable("inventory_reconciliations", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  productId: text("product_id").notNull().references(() => products.id),
  variantId: text("variant_id"),
  locationId: text("location_id").notNull().references(() => inventoryLocations.id),
  observedProductStock: integer("observed_product_stock"),
  observedVariantStock: integer("observed_variant_stock"),
  observedLegacyInventoryStock: integer("observed_legacy_inventory_stock"),
  physicalCount: integer("physical_count"),
  approvedOpeningStock: integer("approved_opening_stock"),
  status: text("status").notNull().default("pending"),
  evidence: jsonb("evidence").notNull().default({}),
  notes: text("notes"),
  countedBy: text("counted_by"),
  countedAt: timestamptz("counted_at"),
  approvedBy: text("approved_by"),
  approvedAt: timestamptz("approved_at"),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
  updatedAt: timestamptz("updated_at").notNull().defaultNow(),
}, (table) => ({
  variantFk: foreignKey({
    columns: [table.productId, table.variantId],
    foreignColumns: [productVariantReconciliation.productId, productVariantReconciliation.variantId],
    name: "inventory_reconciliations_variant_fk",
  }),
}));

export const inventoryMovements = pgTable("inventory_movements", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  productId: text("product_id").notNull().references(() => products.id),
  variantId: text("variant_id"),
  locationId: text("location_id").notNull().references(() => inventoryLocations.id),
  quantityDelta: integer("quantity_delta").notNull(),
  movementType: text("movement_type").notNull(),
  sourceType: text("source_type").notNull(),
  sourceId: text("source_id"),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  unitCost: numeric("unit_cost"),
  currency: text("currency").notNull().default("IQD"),
  happenedAt: timestamptz("happened_at").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
  createdBy: text("created_by"),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
  reversedMovementId: text("reversed_movement_id"),
}, (table) => ({
  variantFk: foreignKey({
    columns: [table.productId, table.variantId],
    foreignColumns: [productVariantReconciliation.productId, productVariantReconciliation.variantId],
    name: "inventory_movements_variant_fk",
  }),
  reversedMovementFk: foreignKey({
    columns: [table.reversedMovementId],
    foreignColumns: [table.id],
    name: "inventory_movements_reversed_movement_id_fkey",
  }),
  balanceIdx: index("inventory_movements_balance_idx").on(table.productId, table.variantId, table.locationId, table.happenedAt),
  sourceIdx: index("inventory_movements_source_idx").on(table.sourceType, table.sourceId),
}));

export const suppliers = pgTable("suppliers", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  code: text("code").notNull().unique(),
  legalName: text("legal_name").notNull(),
  displayName: text("display_name").notNull(),
  countryCode: text("country_code"),
  contactName: text("contact_name"),
  email: text("email"),
  phone: text("phone"),
  website: text("website"),
  paymentTerms: text("payment_terms"),
  defaultCurrency: text("default_currency").notNull().default("USD"),
  leadTimeDays: integer("lead_time_days"),
  minimumOrderValue: numeric("minimum_order_value"),
  isActive: boolean("is_active").notNull().default(true),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
  updatedAt: timestamptz("updated_at").notNull().defaultNow(),
});

export const supplierProducts = pgTable("supplier_products", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  supplierId: text("supplier_id").notNull().references(() => suppliers.id),
  productId: text("product_id").notNull().references(() => products.id),
  variantId: text("variant_id"),
  supplierSku: text("supplier_sku"),
  manufacturerPartNumber: text("manufacturer_part_number"),
  supplierProductName: text("supplier_product_name"),
  unitOfMeasure: text("unit_of_measure").notNull().default("unit"),
  packSize: numeric("pack_size").notNull().default("1"),
  minimumOrderQuantity: numeric("minimum_order_quantity"),
  lastQuotedUnitCost: numeric("last_quoted_unit_cost"),
  currency: text("currency").notNull().default("USD"),
  leadTimeDays: integer("lead_time_days"),
  isPreferred: boolean("is_preferred").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
  updatedAt: timestamptz("updated_at").notNull().defaultNow(),
}, (table) => ({
  variantFk: foreignKey({
    columns: [table.productId, table.variantId],
    foreignColumns: [productVariantReconciliation.productId, productVariantReconciliation.variantId],
    name: "supplier_products_variant_fk",
  }),
  productIdx: index("supplier_products_product_idx").on(table.productId, table.variantId, table.isActive),
}));

export const supplierQuotes = pgTable("supplier_quotes", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  supplierId: text("supplier_id").notNull().references(() => suppliers.id),
  quoteNumber: text("quote_number"),
  quotedAt: timestamptz("quoted_at").notNull(),
  validUntil: timestamptz("valid_until"),
  currency: text("currency").notNull(),
  incoterm: text("incoterm"),
  shippingMethod: text("shipping_method"),
  shippingCost: numeric("shipping_cost"),
  customsCost: numeric("customs_cost"),
  otherCost: numeric("other_cost"),
  status: text("status").notNull().default("draft"),
  sourceDocumentUrl: text("source_document_url"),
  sourceDocumentHash: text("source_document_hash"),
  notes: text("notes"),
  createdBy: text("created_by"),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
  updatedAt: timestamptz("updated_at").notNull().defaultNow(),
});

export const supplierQuoteItems = pgTable("supplier_quote_items", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  quoteId: text("quote_id").notNull().references(() => supplierQuotes.id, { onDelete: "cascade" }),
  supplierProductId: text("supplier_product_id").references(() => supplierProducts.id),
  productId: text("product_id").notNull().references(() => products.id),
  variantId: text("variant_id"),
  quantity: numeric("quantity").notNull(),
  unitCost: numeric("unit_cost").notNull(),
  packSize: numeric("pack_size").notNull().default("1"),
  lineTotal: numeric("line_total").notNull(),
  notes: text("notes"),
  metadata: jsonb("metadata").notNull().default({}),
}, (table) => ({
  variantFk: foreignKey({
    columns: [table.productId, table.variantId],
    foreignColumns: [productVariantReconciliation.productId, productVariantReconciliation.variantId],
    name: "supplier_quote_items_variant_fk",
  }),
  quoteIdx: index("supplier_quote_items_quote_idx").on(table.quoteId),
}));

export const purchaseOrders = pgTable("purchase_orders", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  purchaseOrderNumber: text("purchase_order_number").notNull().unique(),
  supplierId: text("supplier_id").notNull().references(() => suppliers.id),
  sourceQuoteId: text("source_quote_id").references(() => supplierQuotes.id),
  status: text("status").notNull().default("draft"),
  currency: text("currency").notNull(),
  subtotal: numeric("subtotal").notNull().default("0"),
  shippingCost: numeric("shipping_cost").notNull().default("0"),
  customsCost: numeric("customs_cost").notNull().default("0"),
  otherCost: numeric("other_cost").notNull().default("0"),
  total: numeric("total").notNull().default("0"),
  orderedAt: timestamptz("ordered_at"),
  expectedAt: timestamptz("expected_at"),
  approvedBy: text("approved_by"),
  approvedAt: timestamptz("approved_at"),
  notes: text("notes"),
  createdBy: text("created_by"),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
  updatedAt: timestamptz("updated_at").notNull().defaultNow(),
}, (table) => ({
  supplierStatusIdx: index("purchase_orders_supplier_status_idx").on(table.supplierId, table.status, table.createdAt),
}));

export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  purchaseOrderId: text("purchase_order_id").notNull().references(() => purchaseOrders.id, { onDelete: "cascade" }),
  supplierProductId: text("supplier_product_id").references(() => supplierProducts.id),
  productId: text("product_id").notNull().references(() => products.id),
  variantId: text("variant_id"),
  orderedQuantity: numeric("ordered_quantity").notNull(),
  receivedQuantity: numeric("received_quantity").notNull().default("0"),
  unitCost: numeric("unit_cost").notNull(),
  lineTotal: numeric("line_total").notNull(),
  unitOfMeasure: text("unit_of_measure").notNull().default("unit"),
  metadata: jsonb("metadata").notNull().default({}),
}, (table) => ({
  variantFk: foreignKey({
    columns: [table.productId, table.variantId],
    foreignColumns: [productVariantReconciliation.productId, productVariantReconciliation.variantId],
    name: "purchase_order_items_variant_fk",
  }),
  purchaseOrderIdx: index("purchase_order_items_po_idx").on(table.purchaseOrderId),
}));

export const goodsReceipts = pgTable("goods_receipts", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  receiptNumber: text("receipt_number").notNull().unique(),
  purchaseOrderId: text("purchase_order_id").notNull().references(() => purchaseOrders.id),
  locationId: text("location_id").notNull().references(() => inventoryLocations.id),
  status: text("status").notNull().default("draft"),
  receivedAt: timestamptz("received_at"),
  carrier: text("carrier"),
  trackingNumber: text("tracking_number"),
  receivedBy: text("received_by"),
  verifiedBy: text("verified_by"),
  verifiedAt: timestamptz("verified_at"),
  notes: text("notes"),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
  updatedAt: timestamptz("updated_at").notNull().defaultNow(),
}, (table) => ({
  purchaseOrderIdx: index("goods_receipts_po_idx").on(table.purchaseOrderId, table.status),
}));

export const goodsReceiptItems = pgTable("goods_receipt_items", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  goodsReceiptId: text("goods_receipt_id").notNull().references(() => goodsReceipts.id, { onDelete: "cascade" }),
  purchaseOrderItemId: text("purchase_order_item_id").notNull().references(() => purchaseOrderItems.id),
  productId: text("product_id").notNull().references(() => products.id),
  variantId: text("variant_id"),
  acceptedQuantity: numeric("accepted_quantity").notNull().default("0"),
  damagedQuantity: numeric("damaged_quantity").notNull().default("0"),
  missingQuantity: numeric("missing_quantity").notNull().default("0"),
  rejectedQuantity: numeric("rejected_quantity").notNull().default("0"),
  unitCost: numeric("unit_cost"),
  lotNumber: text("lot_number"),
  expiryDate: date("expiry_date"),
  inventoryMovementId: text("inventory_movement_id").references(() => inventoryMovements.id),
  notes: text("notes"),
  metadata: jsonb("metadata").notNull().default({}),
}, (table) => ({
  variantFk: foreignKey({
    columns: [table.productId, table.variantId],
    foreignColumns: [productVariantReconciliation.productId, productVariantReconciliation.variantId],
    name: "goods_receipt_items_variant_fk",
  }),
  poItemUnique: uniqueIndex("goods_receipt_items_po_item_unique_idx").on(table.goodsReceiptId, table.purchaseOrderItemId),
}));

export const landedCostAllocations = pgTable("landed_cost_allocations", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  purchaseOrderId: text("purchase_order_id").notNull().references(() => purchaseOrders.id),
  purchaseOrderItemId: text("purchase_order_item_id").references(() => purchaseOrderItems.id),
  allocationType: text("allocation_type").notNull(),
  amount: numeric("amount").notNull(),
  currency: text("currency").notNull(),
  allocationMethod: text("allocation_method").notNull(),
  exchangeRateToIqd: numeric("exchange_rate_to_iqd"),
  allocatedAmountIqd: numeric("allocated_amount_iqd"),
  evidence: jsonb("evidence").notNull().default({}),
  createdBy: text("created_by"),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
}, (table) => ({
  purchaseOrderIdx: index("landed_cost_allocations_po_idx").on(table.purchaseOrderId, table.purchaseOrderItemId),
}));

export const paymentEvents = pgTable("payment_events", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  orderId: text("order_id").notNull().references(() => orders.id),
  eventType: text("event_type").notNull(),
  status: text("status").notNull(),
  amount: numeric("amount").notNull(),
  currency: text("currency").notNull().default("IQD"),
  method: text("method").notNull(),
  provider: text("provider"),
  providerTransactionId: text("provider_transaction_id"),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  occurredAt: timestamptz("occurred_at").notNull(),
  evidence: jsonb("evidence").notNull().default({}),
  metadata: jsonb("metadata").notNull().default({}),
  createdBy: text("created_by"),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
  reversesEventId: text("reverses_event_id"),
}, (table) => ({
  reversalFk: foreignKey({
    columns: [table.reversesEventId],
    foreignColumns: [table.id],
    name: "payment_events_reverses_event_id_fkey",
  }),
  orderIdx: index("payment_events_order_idx").on(table.orderId, table.occurredAt),
  providerIdx: index("payment_events_provider_idx").on(table.provider, table.providerTransactionId),
}));

export const cashSettlements = pgTable("cash_settlements", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  settlementNumber: text("settlement_number").notNull().unique(),
  carrier: text("carrier").notNull(),
  status: text("status").notNull().default("draft"),
  grossAmount: numeric("gross_amount").notNull().default("0"),
  feesAmount: numeric("fees_amount").notNull().default("0"),
  netAmount: numeric("net_amount").notNull().default("0"),
  currency: text("currency").notNull().default("IQD"),
  receivedAt: timestamptz("received_at"),
  bankReference: text("bank_reference"),
  evidence: jsonb("evidence").notNull().default({}),
  notes: text("notes"),
  createdBy: text("created_by"),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
  updatedAt: timestamptz("updated_at").notNull().defaultNow(),
});

export const cashSettlementItems = pgTable("cash_settlement_items", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  settlementId: text("settlement_id").notNull().references(() => cashSettlements.id, { onDelete: "cascade" }),
  orderId: text("order_id").notNull().references(() => orders.id),
  paymentEventId: text("payment_event_id").references(() => paymentEvents.id),
  grossAmount: numeric("gross_amount").notNull(),
  feeAmount: numeric("fee_amount").notNull().default("0"),
  netAmount: numeric("net_amount").notNull(),
  reconciliationStatus: text("reconciliation_status").notNull().default("pending"),
  notes: text("notes"),
  metadata: jsonb("metadata").notNull().default({}),
}, (table) => ({
  orderIdx: index("cash_settlement_items_order_idx").on(table.orderId, table.reconciliationStatus),
  settlementOrderUnique: uniqueIndex("cash_settlement_items_order_unique").on(table.settlementId, table.orderId),
}));

export const orderFinancialAdjustments = pgTable("order_financial_adjustments", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  orderId: text("order_id").notNull().references(() => orders.id),
  adjustmentType: text("adjustment_type").notNull(),
  amount: numeric("amount").notNull(),
  reason: text("reason").notNull(),
  evidence: jsonb("evidence").notNull().default({}),
  approvedBy: text("approved_by"),
  approvedAt: timestamptz("approved_at"),
  createdBy: text("created_by"),
  createdAt: timestamptz("created_at").notNull().defaultNow(),
}, (table) => ({
  orderIdx: index("order_financial_adjustments_order_idx").on(table.orderId, table.createdAt),
}));

export type InventoryMovement = typeof inventoryMovements.$inferSelect;
export type InsertInventoryMovement = typeof inventoryMovements.$inferInsert;
export type Supplier = typeof suppliers.$inferSelect;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type GoodsReceipt = typeof goodsReceipts.$inferSelect;
export type PaymentEvent = typeof paymentEvents.$inferSelect;
