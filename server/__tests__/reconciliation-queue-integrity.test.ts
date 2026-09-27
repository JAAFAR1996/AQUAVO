import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("0089 reconciliation queue integrity", () => {
  const source = readFileSync(
    resolve(process.cwd(), "migrations/0089_reconciliation_queue_integrity.sql"),
    "utf8",
  );

  it("keeps production financial reconciliation free of test orders and treats NULL as auto", () => {
    expect(source).toContain("COALESCE(o.is_test,false)=false");
    expect(source).toContain("JOIN public.orders o ON o.id=r.order_id");
    expect(source).not.toContain("financial_counting_undecided");
  });

  it("requires carrier settlement only when cash is actually in carrier custody", () => {
    expect(source).toContain("COALESCE(f.cash_custody,'carrier')='carrier'");
    expect(source).toContain("WHEN f.cash_custody<>'carrier' THEN 'not_required'::text");
  });

  it("does not classify a formula-correct order as broken only because it rounded down", () => {
    expect(source).not.toContain("rounded_below_total");
    expect(source).toContain("abs(o.total - o.formula_total_snapshot) > 1::numeric");
  });

  it("accepts the invoice API's documented 250-IQD cash rounding", () => {
    expect(source).toContain("ceil((mi.subtotal-mi.discount+mi.delivery)/250.0)*250");
  });

  it("backfills the missing 0087 product cost history without changing current costs", () => {
    expect(source).toContain("variant_collapse_top_level_cost_sync");
    expect(source).toContain("INSERT INTO public.product_cost_history");
  });

  it("keeps the migration ledgered and dependent on 0088", () => {
    expect(source).toContain("0089_REQUIRES_ACTIVE_0088");
    expect(source).toContain("'0089_reconciliation_queue_integrity'");
  });
});
