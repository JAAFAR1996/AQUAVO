import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("variant inventory configuration contract", () => {
  const source = readFileSync(
    join(process.cwd(), "server/services/inventory-adjustment-service.ts"),
    "utf8",
  );

  it("never silently discards positive stock when one variant is deleted", () => {
    expect(source).toContain("if (hasVariants && currentVariantStock > 0)");
    expect(source).toContain("لا يمكن حذف الخيار");
    expect(source).not.toContain(
      "Removed variants must be emptied through the ledger before their JSON",
    );
  });

  it("preserves aggregate stock when disabling variants", () => {
    expect(source).toContain("const currentAggregateStock = Number(current.stock ?? 0)");
    expect(source).toContain("} else if (currentHasVariants) {");
    expect(source).toContain(
      "setCanonicalProductStock(tx, actor, productId, currentAggregateStock, null)",
    );
  });

  it("does not zero base stock when a product is already simple", () => {
    const fnStart = source.indexOf("export async function setCanonicalVariantConfiguration");
    const fn = source.slice(fnStart);
    expect(fn).not.toContain(
      "After the structure becomes simple, clear any historical base-ledger",
    );
    expect(fn).not.toContain(
      "setCanonicalProductStock(tx, actor, productId, 0, null));\n  }\n\n  return",
    );
  });
});
