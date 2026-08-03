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

  it("mounts accounting operations and canonical reports before the legacy API", () => {
    const routes = read("server/routes.ts");
    const operations = routes.indexOf('app.use("/api/admin/accounting", createAccountingOperationsV2Router())');
    const reports = routes.indexOf('app.use("/api/admin/accounting", createAccountingV2Router())');
    const legacy = routes.indexOf('app.use("/api/admin/accounting", createAccountingRouter())');
    expect(operations).toBeGreaterThan(-1);
    expect(operations).toBeLessThan(reports);
    expect(reports).toBeLessThan(legacy);
  });

  it("keeps state, packaging and financial recognition inside one transaction", () => {
    const source = read("server/routes/admin-orders-v2.ts");
    expect(source).toContain("db.transaction(async (tx)");
    expect(source).toContain("FOR UPDATE");
    expect(source).toContain("applyPackagingLifecycle(tx as never");
    expect(source).toContain("tx.update(orders)");
    expect(source).not.toContain("applyPackagingLifecycle(getDb()");
    expect(source).not.toContain('from "../storage/index.js"');
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
    expect(source).toContain("net !== gross - fees");
    expect(source).toContain("INSERT INTO public.cash_settlement_items");
    expect(source).toContain("SET status='reconciled'");
  });

  it("uploads evidence with server-computed SHA-256 and verifies expenses atomically", () => {
    const upload = read("server/routes/upload.ts");
    const operations = read("server/routes/accounting-operations-v2.ts");
    expect(upload).toContain('createHash("sha256")');
    expect(upload).toContain('"/accounting-evidence"');
    expect(upload).toContain('file.mimetype === "application/pdf"');
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

  it("shows gross COD, carrier fee, merchant net and close blockers separately", () => {
    const component = read("client/src/components/admin/finance-accounting-register-v2.tsx");
    for (const field of [
      "gross_collected", "customer_delivery_fee", "carrier_fee", "product_revenue",
      "merchant_net", "delivery_subsidy", "blockers", "administrativeCloseReady",
    ]) expect(component).toContain(field);
    expect(component).toContain("/api/admin/accounting/v2/accountant-package");
    expect(component).toContain("/api/admin/accounting/v2/periods/close");
    expect(component).toContain("<FinanceAccountingOperationsV2 periodKey={periodKey} />");
  });

  it("provides operator forms for carrier statements and expense receipts", () => {
    const component = read("client/src/components/admin/finance-accounting-operations-v2.tsx");
    expect(component).toContain("/api/admin/accounting/v2/settlements");
    expect(component).toContain("/api/admin/accounting/v2/expenses/${expenseId}/verify");
    expect(component).toContain("/api/upload/accounting-evidence");
    expect(component).toContain('accept="image/*,application/pdf"');
    expect(component).not.toContain("paidFromAccountCode");
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
      "opening_inventory_snapshot",
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
    expect(migration).toContain("'0056_accounting_delivery_timestamp'");
    expect(migration).toContain("a5b2ea02880466220f8a02398310024a2c80ffc66cda25542c2a0f1b56b09236");
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
