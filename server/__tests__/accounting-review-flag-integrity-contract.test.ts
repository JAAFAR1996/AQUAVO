import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("accounting review flag integrity", () => {
  it("blocks generic closure of inventory valuation reconciliation flags", () => {
    const source = read("server/services/accountingManualOverrides.ts");

    expect(source).toContain('flag.category === "inventory_valuation_reconciliation"');
    expect(source).toContain('status !== "open"');
    expect(source).toContain(
      "Inventory valuation reconciliation requires a posted accounting reconciliation",
    );
    expect(source).toContain("(error as any).status = 409");
  });

  it("still allows generic status updates for other review flag categories", () => {
    const source = read("server/services/accountingManualOverrides.ts");

    expect(source).toContain(".update(accountingReviewFlags)");
    expect(source).toContain("resolvedAt: status !== \"open\" ? new Date() : null");
    expect(source).toContain("resolvedBy: status !== \"open\" ? (resolvedBy ?? null) : null");
  });

  it("removes unsafe resolve and ignore actions from inventory valuation flags in admin UI", () => {
    const source = read("client/src/components/admin/finance-manual-corrections.tsx");

    expect(source).toContain(
      'f.status === "open" && f.category === "inventory_valuation_reconciliation"',
    );
    expect(source).toContain("لا يمكن إغلاقه أو تجاهله من هنا");
    expect(source).toContain("يجب أولاً تسجيل تسوية محاسبية فعلية بقيد متوازن");
  });
});
