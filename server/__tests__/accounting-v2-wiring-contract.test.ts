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

  it("mounts the canonical accounting API before the legacy accounting API", () => {
    const routes = read("server/routes.ts");
    expect(routes.indexOf('app.use("/api/admin/accounting", createAccountingV2Router())'))
      .toBeLessThan(routes.indexOf('app.use("/api/admin/accounting", createAccountingRouter())'));
  });

  it("keeps state, packaging and financial recognition inside one transaction", () => {
    const source = read("server/routes/admin-orders-v2.ts");
    expect(source).toContain("db.transaction(async (tx)");
    expect(source).toContain("FOR UPDATE");
    expect(source).toContain("applyPackagingLifecycle(tx as never");
    expect(source).toContain("tx.update(orders)");
    expect(source).not.toContain("applyPackagingLifecycle(getDb()");
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
  });
});

describe("accounting v2 migration governance", () => {
  it("declares new tables in Drizzle and includes them in db governance", () => {
    const config = read("drizzle.config.ts");
    expect(config).toContain('"./shared/accounting-schema-v2.ts"');
    for (const table of [
      "accounting_cutovers", "order_accounting_facts", "order_accounting_settlements",
      "chart_of_accounts", "journal_entries", "journal_lines", "evidence_files",
      "tax_profiles", "opening_inventory_snapshot",
    ]) expect(config).toContain(`"${table}"`);
  });

  it("ships forward and rollback files for every accounting migration", () => {
    for (let n = 51; n <= 55; n += 1) {
      const prefix = `00${n}_accounting_`;
      const files = [
        "0051_accounting_august_foundation",
        "0052_accounting_cod_delivery_settlements",
        "0053_accounting_expenses_returns",
        "0054_accounting_fulfillment_readiness",
        "0055_accounting_checksum_manifest",
      ].filter((name) => name.startsWith(prefix));
      expect(files).toHaveLength(1);
      expect(existsSync(join(root, "migrations", `${files[0]}.sql`))).toBe(true);
      expect(existsSync(join(root, "migrations", `${files[0]}_rollback.sql`))).toBe(true);
    }
  });

  it("replaces provisional repeated-character ledger checksums", () => {
    const manifest = read("migrations/0055_accounting_checksum_manifest.sql");
    expect(manifest).toContain("621379dcb40456e016224b7d325f94368102f7a0711bd0b9d66cdbb8dd2efc79");
    expect(manifest).toContain("8469d31ee908c682295d5631d8c46e61b28df98b6bfb5caab3df1cbc138fcfa6");
    expect(manifest).toContain("78ae41fdbcbf51a67e2b2ac4228f2f19ec8fe1bd1110aff389f315a7b0d886c4");
    expect(manifest).toContain("a21a6853eba521cac327d78a0b34a0c0bfeae313bf4940744d02859f4f35782e");
  });
});
