import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const accountingRoute = source("server/routes/accounting-v2.ts");
const operationsRoute = source("server/routes/accounting-operations-v2.ts");
const correctionRoute = source("server/routes/accounting-carrier-correction-v2.ts");
const smartCarrierRoute = source("server/routes/accounting-smart-carrier-v2.ts");
const financeUi = source("client/src/components/admin/finance-accounting-register-v2.tsx");
const accountantPdf = source("client/src/lib/accountant-pdf-v2.ts");
const migration78 = source("migrations/0078_accounting_external_handoff_hardening.sql");
const rollback78 = source("migrations/0078_accounting_external_handoff_hardening_rollback.sql");

describe("Accounting V3 external handoff hardening", () => {
  it("requires the latest migration and exposes the active V3 policy", () => {
    expect(accountingRoute).toContain('0078_accounting_external_handoff_hardening');
    expect(accountingRoute).toContain('migrationsThrough: "0078"');
    expect(accountingRoute).toContain('v3_explicit_rounding_carrier_snapshot');
    expect(accountingRoute).toContain('procurement_integrity_failures');
    expect(accountingRoute).toContain('settlement_integrity_failures');
  });

  it("uses the canonical profit formula including rounding and FX expense", () => {
    expect(financeUi).toContain('summary.product_revenue + summary.rounding_adjustment');
    expect(financeUi).toContain('summary.fx_net_expense');
    expect(financeUi).not.toContain('summary.product_revenue - summary.cogs - summary.fulfillment_cost');
  });

  it("persists immutable carrier corrections and settles against effective identity", () => {
    expect(migration78).toContain('CREATE TABLE IF NOT EXISTS public.order_accounting_carrier_corrections');
    expect(migration78).toContain('ORDER_ACCOUNTING_CARRIER_CORRECTION_IMMUTABLE');
    expect(migration78).toContain('accounting_effective_carrier');
    expect(correctionRoute).toContain('INSERT INTO public.order_accounting_carrier_corrections');
    expect(operationsRoute).toContain('public.accounting_effective_carrier(f.id) AS carrier');
    expect(smartCarrierRoute).toContain('public.accounting_effective_carrier(f.id) AS carrier');
  });

  it("prevents malformed settlement requests from committing carrier correction side effects", () => {
    expect(correctionRoute).toContain('receivedAt: z.string().datetime({ offset: true })');
    expect(correctionRoute).toContain('evidence: evidenceInputSchema');
    expect(correctionRoute).toContain('}).strict();');
    expect(correctionRoute).toContain('orderIds.length !== parsed.data.orderIds.length');
    expect(correctionRoute).toContain('قائمة الطلبات تحتوي تكراراً');
    expect(correctionRoute).toContain('FOR UPDATE OF f');
    expect(correctionRoute).not.toContain('FOR UPDATE OF o');
  });

  it("enforces and serializes carrier correction integrity in PostgreSQL", () => {
    expect(migration78).toContain('validate_order_accounting_carrier_correction_insert');
    expect(migration78).toContain('ORDER_ACCOUNTING_CARRIER_CORRECTION_ORDER_FACT_MISMATCH');
    expect(migration78).toContain('ORDER_ACCOUNTING_CARRIER_CORRECTION_COMPANY_NAME_MISMATCH');
    expect(migration78).toContain('ORDER_ACCOUNTING_CARRIER_CORRECTION_FEE_MISMATCH');
    expect(migration78).toContain('ORDER_ACCOUNTING_CARRIER_CORRECTION_COMPANY_FEE_MISMATCH');
    expect(migration78).toContain('ORDER_ACCOUNTING_CARRIER_CORRECTION_PRIOR_MISMATCH');
    expect(migration78).toContain('ORDER_ACCOUNTING_CARRIER_CORRECTION_NOOP');
    expect(migration78).toMatch(/FROM public\.order_accounting_facts f[\s\S]*?WHERE f\.id=NEW\.order_fact_id[\s\S]*?FOR UPDATE/);
    expect(migration78).toContain('order_accounting_carrier_corrections_validate_insert');
    expect(rollback78).toContain('DROP FUNCTION IF EXISTS public.validate_order_accounting_carrier_correction_insert()');
  });

  it("forces owner inventory reconciliations into accounting review", () => {
    expect(migration78).toContain('flag_owner_stock_reconciliation_for_accounting');
    expect(migration78).toContain('inventory_valuation_reconciliation');
    expect(migration78).toContain('INVENTORY-UNIFY-20260817');
    expect(migration78).toContain('identified_gl_difference_iqd');
  });

  it("exports complete journal and opening-inventory accountant detail", () => {
    expect(accountingRoute).toContain("'accountCode',l.account_code");
    expect(accountingRoute).toContain("'accountName',a.name_ar");
    expect(accountantPdf).toContain('دفتر اليومية التفصيلي');
    expect(accountantPdf).toContain('accountCode');
    expect(accountantPdf).toContain('فهرس الأدلة');
    expect(accountantPdf).toContain('row.total_cost');
    expect(accountantPdf).toContain('row.cost_status');
  });
});
