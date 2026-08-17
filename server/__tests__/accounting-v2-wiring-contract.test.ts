import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("accounting v2 production wiring", () => {
  it("mounts atomic order transitions before the legacy admin router", () => {
    const routes = read("server/routes.ts");
    expect(routes).toContain('import { createAdminOrdersV2Router } from "./routes/admin-orders-v2.js"');
    expect(routes.indexOf('app.use("/api/admin", createAdminOrdersV2Router())'))
      .toBeLessThan(routes.indexOf('app.use("/api/admin", createAdminRouter())'));
  });

  it("mounts atomic WhatsApp confirmation before the legacy invoice router", () => {
    const routes = read("server/routes.ts");
    expect(routes.indexOf('app.use("/api/invoice", createInvoiceV2Router())'))
      .toBeLessThan(routes.indexOf('app.use("/api/invoice", createInvoiceRouter())'));
  });

  it("mounts setup, carrier correction, operations and reports before legacy accounting", () => {
    const routes = read("server/routes.ts");
    const setup = routes.indexOf('app.use("/api/admin/accounting", createAccountingSetupV2Router())');
    const correction = routes.indexOf('app.use("/api/admin/accounting", createAccountingCarrierCorrectionV2Router())');
    const operations = routes.indexOf('app.use("/api/admin/accounting", createAccountingOperationsV2Router())');
    const reports = routes.indexOf('app.use("/api/admin/accounting", createAccountingV2Router())');
    const legacy = routes.indexOf('app.use("/api/admin/accounting", createAccountingRouter())');
    expect(setup).toBeGreaterThan(-1);
    expect(setup).toBeLessThan(correction);
    expect(correction).toBeLessThan(operations);
    expect(operations).toBeLessThan(reports);
    expect(reports).toBeLessThan(legacy);
  });

  it("uses a storage-independent admin guard for every V2 admin route", () => {
    const guard = read("server/middleware/accounting-auth-v2.ts");
    expect(guard).toContain(".from(users)");
    expect(guard).not.toContain('from "../storage/index.js"');
    for (const file of [
      "server/routes/admin-orders-v2.ts",
      "server/routes/accounting-v2.ts",
      "server/routes/accounting-setup-v2.ts",
      "server/routes/accounting-carrier-correction-v2.ts",
      "server/routes/accounting-operations-v2.ts",
      "server/routes/accounting-evidence-upload-v2.ts",
    ]) {
      const source = read(file);
      expect(source).toContain("requireAccountingAdmin");
      expect(source).not.toContain('from "../middleware/auth.js"');
      expect(source).not.toContain('from "../storage/index.js"');
    }
  });

  it("keeps state, packaging, returns and financial recognition inside one transaction", () => {
    const source = read("server/routes/admin-orders-v2.ts");
    expect(source).toContain("db.transaction(async (tx)");
    expect(source).toContain("FOR UPDATE");
    expect(source).toContain("applyPackagingLifecycle(tx as never");
    expect(source).toContain("syncAutomaticReturnLifecycle(tx");
    expect(source).toContain("tx.update(orders)");
    expect(source).not.toContain("applyPackagingLifecycle(getDb()");
    expect(source).toContain("recordFinancialChange(tx as never");
  });

  it("confirms WhatsApp invoices atomically and idempotently", () => {
    const source = read("server/routes/invoice-v2.ts");
    expect(source).toContain("db.transaction(async (tx)");
    expect(source).toContain("FROM manual_invoices WHERE token=${req.params.token} FOR UPDATE");
    expect(source).toContain('invoice.status === "confirmed" && invoice.order_id');
    expect(source).toContain("tx.insert(orders)");
    expect(source).toContain("tx.insert(orderItems)");
    expect(source).toContain("tx.update(manualInvoices)");
  });

  it("derives settlements from immutable order facts and reconciles by status transition", () => {
    const source = read("server/routes/accounting-operations-v2.ts");
    expect(source).toContain("FROM public.order_accounting_facts f");
    expect(source).toContain("FOR UPDATE OF f");
    expect(source).toContain("Math.abs(net - (gross - fees))");
    expect(source).toContain("INSERT INTO public.cash_settlement_items");
    expect(source).toContain("SET status='reconciled'");
  });

  it("allows audited carrier identity correction only when the frozen fee matches", () => {
    const source = read("server/routes/accounting-carrier-correction-v2.ts");
    expect(source).toContain("Math.abs(amount(fact.carrier_fee) - amount(company.default_fee))");
    expect(source).toContain("الأجرة المالية لم تتغير");
    expect(source).toContain("recordFinancialChange(tx as never");
    // Keep one lock order across correction + settlement paths: immutable fact first.
    // The correction insert trigger subsequently locks the matching order row.
    expect(source).toContain("FOR UPDATE OF f");
    expect(source).not.toContain("FOR UPDATE OF o");
  });

  it("mounts isolated evidence upload first and computes SHA-256 on original bytes", () => {
    const routes = read("server/routes.ts");
    const upload = read("server/routes/accounting-evidence-upload-v2.ts");
    expect(routes.indexOf('app.use("/api/upload", createAccountingEvidenceUploadV2Router())'))
      .toBeLessThan(routes.indexOf('app.use("/api/upload", createUploadRouter())'));
    expect(upload).toContain('createHash("sha256")');
    expect(upload).toContain('"/accounting-evidence"');
    expect(upload).toContain('file.mimetype === "application/pdf"');
    expect(upload).toContain("req.file.buffer");
  });

  it("verifies expense evidence atomically and posts owner-paid costs to capital", () => {
    const operations = read("server/routes/accounting-operations-v2.ts");
    expect(operations).toContain("db.transaction(async (tx)");
    expect(operations).toContain("INSERT INTO public.evidence_files");
    expect(operations).toContain("accounting_status='verified'");
    expect(operations).toContain(': "3100"');
    expect(operations).not.toContain('paidFromAccountCode: z.enum');
  });
});

describe("accounting v2 operator workspace", () => {
  it("uses the canonical register as the default finance tab", () => {
    const finance = read("client/src/pages/admin/finance.tsx");
    expect(finance).toContain('defaultValue="accounting-register"');
    expect(finance).toContain("<FinanceAccountingRegisterV2 />");
  });

  it("shows the canonical money fields, automatic close state and PDF export", () => {
    const component = read("client/src/components/admin/finance-accounting-register-v2.tsx");
    for (const field of [
      "gross_collected", "customer_delivery_fee", "carrier_fee", "product_revenue",
      "merchant_net", "delivery_subsidy", "blockers", "administrativeCloseReady",
      "liveBalances", "automaticClose",
    ]) expect(component).toContain(field);
    expect(component).toContain("/api/admin/accounting/v2/accountant-package");
    expect(component).toContain("downloadAccountantPdfV2");
    expect(component).toContain("<FinanceAccountingOperationsLiteV2 periodKey={periodKey} />");
    expect(component).not.toContain("/api/admin/accounting/v2/periods/close");
    expect(component).not.toContain("إغلاق إداري للشهر");
  });

  it("keeps tax classification out of the owner UI and retains evidence capture", () => {
    const component = read("client/src/components/admin/finance-accounting-operations-lite-v2.tsx");
    expect(component).toContain("/api/admin/accounting/v2/expenses/${expenseId}/verify");
    expect(component).toContain("/api/upload/accounting-evidence");
    expect(component).toContain('accept="image/*,application/pdf"');
    expect(component).toContain("تأكيد داخلي — بدون ملف");
    expect(component).toContain('taxTreatment: "pending"');
    expect(component).not.toContain("المعاملة الضريبية");
    expect(component).not.toContain("savePosition");
  });
});

describe("accounting v2 migration governance", () => {
  it("keeps accounting schema available for types but outside partial db:push governance", () => {
    const config = read("drizzle.config.ts");
    expect(config).toContain('"./shared/accounting-schema-v2.ts"');
    expect(config).toContain("migration SQL is");
    for (const table of [
      "orders", "expenses", "accounting_period_closes", "accounting_cutovers",
      "order_accounting_facts", "order_accounting_settlements", "chart_of_accounts",
      "journal_entries", "journal_lines", "evidence_files", "tax_profiles",
      "opening_inventory_snapshot", "delivery_companies", "accounting_monthly_positions",
    ]) {
      expect(config).not.toMatch(new RegExp(`^\\s*"${table}",?$`, "m"));
    }
  });

  it("ships forward and rollback files for every accounting migration", () => {
    const files = [
      "0051_accounting_august_foundation",
      "0052_accounting_cod_delivery_settlements",
      "0053_accounting_expenses_returns",
      "0054_accounting_fulfillment_readiness",
      "0055_accounting_checksum_manifest",
      "0056_accounting_delivery_timestamp",
      "0057_accounting_operating_defaults",
      "0058_accounting_confirm_global_addons_zero",
      "0059_accounting_carrier_other_deductions",
      "0060_accounting_close_state_machine",
      "0061_accounting_default_carrier_status_guard",
      "0062_accounting_automation_opening_balances",
    ];
    for (const file of files) {
      expect(existsSync(join(root, "migrations", `${file}.sql`))).toBe(true);
      expect(existsSync(join(root, "migrations", `${file}_rollback.sql`))).toBe(true);
    }
  });

  it("replaces provisional repeated-character ledger checksums", () => {
    const manifest = read("migrations/0055_accounting_checksum_manifest.sql");
    expect(manifest).toContain("621379dcb40456e016224b7d325f94368102f7a0711bd0b9d66cdbb8dd2efc79");
    expect(manifest).toContain("8469d31ee908c682295d5631d8c46e61b28df98b6bfb5caab3df1cbc138fcfa6");
    expect(manifest).toContain("78ae41fdbcbf51a67e2b2ac4228f2f19ec8fe1bd1110aff389f315a7b0d886c4");
    expect(manifest).toContain("a21a6853eba521cac327d78a0b34a0c0bfeae313bf4940744d02859f4f35782e");
  });

  it("persists one immutable delivery timestamp across payment, fact and journal", () => {
    const migration = read("migrations/0056_accounting_delivery_timestamp.sql");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS delivered_at timestamptz");
    expect(migration).toContain("CREATE TRIGGER orders_stamp_delivered_at");
    expect(migration).toContain("DELIVERED_AT_IMMUTABLE");
    expect(migration).toContain("v_recognized_at:=COALESCE(NEW.delivered_at,clock_timestamp())");
    expect(migration).toContain("a5b2ea02880466220f8a02398310024a2c80ffc66cda25542c2a0f1b56b09236");
  });

  it("guards the owner-confirmed global zero policy", () => {
    const migration = read("migrations/0058_accounting_confirm_global_addons_zero.sql");
    expect(migration).toContain("GLOBAL_ZERO_CONFIRMATION_BLOCKED");
    expect(migration).toContain("packaging_cost_resolution='verified_zero'");
    expect(migration).toContain("insert_cost_resolution='verified_zero'");
    expect(migration).toContain("owner_confirmation:jaafar:2026-08-03");
    const rollback = read("migrations/0058_accounting_confirm_global_addons_zero_rollback.sql");
    expect(rollback).toContain("IF NOT EXISTS(SELECT 1 FROM public.order_accounting_facts)");
  });

  it("restores the previous tax-finalization guard on rollback", () => {
    const rollback = read("migrations/0054_accounting_fulfillment_readiness_rollback.sql");
    expect(rollback).toContain("CREATE OR REPLACE FUNCTION public.guard_accounting_period_tax_finalization()");
    expect(rollback).toContain("CREATE TRIGGER trg_guard_accounting_period_tax_finalization");
    expect(rollback).toContain("cost_snapshot_status IS DISTINCT FROM 'exact'");
  });

  it("retains delivered_at evidence on rollback when accounting facts exist", () => {
    const rollback = read("migrations/0056_accounting_delivery_timestamp_rollback.sql");
    expect(rollback).toContain("IF NOT EXISTS(SELECT 1 FROM public.order_accounting_facts)");
    expect(rollback).toContain("ALTER TABLE public.orders DROP COLUMN IF EXISTS delivered_at");
    expect(rollback).toContain("UPDATE public.schema_migrations");
  });
});
