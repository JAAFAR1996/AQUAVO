import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const route = readFileSync("server/routes/treasury-v1.ts", "utf8");
const ui = readFileSync("client/src/components/admin/finance-treasury.tsx", "utf8");
const migration = readFileSync("migrations/0103_treasury_cashbook.sql", "utf8");
const finance = readFileSync("client/src/pages/admin/finance.tsx", "utf8");

describe("AQUAVO money-location cashbook contracts", () => {
  it("requires accounting admin on every treasury route and no-store", () => {
    expect(route).toContain("router.use(requireAccountingAdmin)");
    expect(route).toContain('Cache-Control", "private, no-store"');
    expect(route).toContain('router.get("/v2/treasury"');
    expect(route).toContain('router.post("/v2/treasury/accounts"');
  });

  it("does not count a linked card as a second financial asset", () => {
    expect(migration).toContain("(kind='card' AND linked_account_id IS NOT NULL AND opening_balance IS NULL)");
    expect(route).toContain("a.kind='card' OR a.opening_balance IS NULL THEN NULL");
    expect(route).toContain("first.kind === \"card\"");
    expect(route).toContain("from.id === to.id");
    expect(ui).toContain("مو رصيد مستقل، ما يدخل بالمجموع");
  });

  it("does not replace unknown opening balance with a fabricated zero", () => {
    expect(migration).toContain("opening_balance numeric(18,2)");
    expect(route).toContain("a.opening_balance IS NULL THEN NULL");
    expect(route).toContain("الرصيد الافتتاحي للحساب");
    expect(ui).toContain("غير مثبت");
  });

  it("never recognizes Wayl capture as actual bank custody before payout evidence", () => {
    expect(route).toContain("p.status='completed'");
    expect(route).toContain("o.is_test IS DISTINCT FROM true");
    expect(route).toContain("ga.payment_id IS NULL");
    expect(migration).toContain("payment_id text PRIMARY KEY");
    expect(ui).toContain("مو دليل أن المبلغ وصل للبطاقة أو للبنك");
    expect(route).toContain("gateway_payout");
  });

  it("does not create a second general ledger, revenue, or expense journal", () => {
    expect(route).not.toMatch(/INSERT INTO public\.(journal_lines|journal_entries|order_accounting_facts)/i);
    expect(migration).not.toMatch(/ALTER TABLE public\.(journal_lines|journal_entries|orders)/i);
    expect(ui).toContain("المصاريف تحتاج اعتمادها كذلك في السجل المحاسبي");
  });

  it("keeps posted cashbook movements and reconciliations immutable", () => {
    expect(migration).toContain("treasury_movements_immutable");
    expect(migration).toContain("treasury_reconciliations_immutable");
    expect(migration).toContain("treasury_gateway_allocations_immutable");
    expect(route).toContain("حركة بتاريخ مشمول بمطابقة سابقة");
    expect(route).toContain("payment_id=\${v.paymentId}");
  });

  it("makes money location a first-class finance tab", () => {
    expect(finance).toContain('defaultValue="treasury"');
    expect(finance).toContain('<FinanceTreasury />');
  });
});
