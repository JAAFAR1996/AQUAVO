import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("0089 reconciliation queue integrity", () => {
  const source = readFileSync(
    resolve(process.cwd(), "migrations/0089_reconciliation_queue_integrity.sql"),
    "utf8",
  );

  it("keeps production financial reconciliation free of test orders", () => {
    expect(source).toContain("COALESCE(o.is_test,false)=false");
    expect(source).toContain("JOIN public.orders o ON o.id=r.order_id");
  });

  it("does not classify a formula-correct order as broken only because it rounded down", () => {
    expect(source).not.toContain("rounded_below_total");
    expect(source).toContain("abs(o.total - o.formula_total_snapshot) > 1::numeric");
  });

  it("keeps the migration ledgered and dependent on 0088", () => {
    expect(source).toContain("0089_REQUIRES_ACTIVE_0088");
    expect(source).toContain("'0089_reconciliation_queue_integrity'");
  });
});
