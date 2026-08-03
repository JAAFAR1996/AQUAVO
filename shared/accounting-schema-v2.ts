import { sql } from "drizzle-orm";
import { boolean, integer, jsonb, numeric, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * Canonical accounting schema introduced at the 2026-08-01 Baghdad cutover.
 * Database constraints and triggers remain governed by migrations/0051..0054;
 * this module prevents Drizzle schema drift and gives application code typed rows.
 */
export const accountingCutovers = pgTable("accounting_cutovers", {
  id: text("id").primaryKey(),
  cutoverAt: timestamp("cutover_at", { withTimezone: true }).notNull(),
  timezone: text("timezone").notNull(),
  currency: text("currency").notNull().default("IQD"),
  status: text("status").notNull().default("active"),
  notes: jsonb("notes").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderAccountingFacts = pgTable("order_accounting_facts", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  orderId: text("order_id").notNull().unique(),
  paymentEventId: text("payment_event_id").notNull().unique(),
  recognizedAt: timestamp("recognized_at", { withTimezone: true }).notNull(),
  periodKey: text("period_key").notNull(),
  grossCollected: numeric("gross_collected").notNull(),
  customerDeliveryFee: numeric("customer_delivery_fee").notNull(),
  carrierFee: numeric("carrier_fee").notNull(),
  productRevenue: numeric("product_revenue").notNull(),
  merchantNet: numeric("merchant_net").notNull(),
  deliverySubsidy: numeric("delivery_subsidy").notNull().default("0"),
  deliverySurplus: numeric("delivery_surplus").notNull().default("0"),
  cashCustody: text("cash_custody").notNull().default("carrier"),
  cogsAmount: numeric("cogs_amount"),
  costStatus: text("cost_status").notNull(),
  currency: text("currency").notNull().default("IQD"),
  policyVersion: text("policy_version").notNull(),
  evidence: jsonb("evidence").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  periodRecognizedIdx: uniqueIndex("order_accounting_facts_order_unique").on(table.orderId),
}));

export const orderAccountingSettlements = pgTable("order_accounting_settlements", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  orderFactId: text("order_fact_id").notNull().unique(),
  settlementId: text("settlement_id").notNull(),
  settlementItemId: text("settlement_item_id").notNull().unique(),
  grossAmount: numeric("gross_amount").notNull(),
  carrierFee: numeric("carrier_fee").notNull(),
  merchantNet: numeric("merchant_net").notNull(),
  status: text("status").notNull().default("matched"),
  matchedAt: timestamp("matched_at", { withTimezone: true }).notNull().defaultNow(),
  evidence: jsonb("evidence").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const chartOfAccounts = pgTable("chart_of_accounts", {
  code: text("code").primaryKey(),
  nameAr: text("name_ar").notNull(),
  accountType: text("account_type").notNull(),
  normalSide: text("normal_side").notNull(),
  active: boolean("active").notNull().default(true),
  systemAccount: boolean("system_account").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const journalEntries = pgTable("journal_entries", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  entryNumber: numeric("entry_number"),
  entryDate: timestamp("entry_date", { withTimezone: true }).notNull(),
  periodKey: text("period_key").notNull(),
  sourceType: text("source_type").notNull(),
  sourceId: text("source_id").notNull(),
  eventKind: text("event_kind").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("posted"),
  currency: text("currency").notNull().default("IQD"),
  totalDebit: numeric("total_debit").notNull(),
  totalCredit: numeric("total_credit").notNull(),
  reversalOfEntryId: text("reversal_of_entry_id"),
  evidence: jsonb("evidence").notNull().default(sql`'{}'::jsonb`),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const journalLines = pgTable("journal_lines", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  entryId: text("entry_id").notNull(),
  lineNumber: integer("line_number").notNull(),
  accountCode: text("account_code").notNull(),
  debit: numeric("debit").notNull().default("0"),
  credit: numeric("credit").notNull().default("0"),
  memo: text("memo"),
  dimensions: jsonb("dimensions").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const evidenceFiles = pgTable("evidence_files", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  documentType: text("document_type").notNull(),
  documentNumber: text("document_number"),
  documentDate: timestamp("document_date", { mode: "date" }),
  issuer: text("issuer"),
  amount: numeric("amount"),
  currency: text("currency").notNull().default("IQD"),
  storageProvider: text("storage_provider"),
  objectKey: text("object_key"),
  sha256: text("sha256").notNull(),
  metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
  uploadedBy: text("uploaded_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const taxProfiles = pgTable("tax_profiles", {
  id: text("id").primaryKey(),
  legalName: text("legal_name").notNull(),
  brandName: text("brand_name").notNull(),
  taxpayerNumber: text("taxpayer_number"),
  taxBranch: text("tax_branch"),
  chamberNumber: text("chamber_number"),
  chamberClass: text("chamber_class"),
  tradeNameRegistration: text("trade_name_registration"),
  registeredAddress: text("registered_address"),
  fiscalYearStartMonth: integer("fiscal_year_start_month").notNull().default(1),
  currency: text("currency").notNull().default("IQD"),
  timezone: text("timezone").notNull().default("Asia/Baghdad"),
  status: text("status").notNull().default("draft"),
  accountantName: text("accountant_name"),
  accountantLicenseNumber: text("accountant_license_number"),
  accountantApprovedAt: timestamp("accountant_approved_at", { withTimezone: true }),
  approvalEvidenceId: text("approval_evidence_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const openingInventorySnapshot = pgTable("opening_inventory_snapshot", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
  cutoverId: text("cutover_id").notNull(),
  productId: text("product_id").notNull(),
  variantId: text("variant_id"),
  locationId: text("location_id").notNull(),
  quantity: integer("quantity").notNull(),
  unitCost: numeric("unit_cost"),
  costStatus: text("cost_status").notNull(),
  totalCost: numeric("total_cost"),
  asOf: timestamp("as_of", { withTimezone: true }).notNull(),
  evidence: jsonb("evidence").notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Columns added to the existing orders table by migration 0052. */
export interface AccountingOrderColumns {
  deliveredAt: Date | null;
  carrierFee: string | null;
}
