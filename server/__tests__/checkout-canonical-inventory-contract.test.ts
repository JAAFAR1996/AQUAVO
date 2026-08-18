import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("checkout canonical inventory contract", () => {
  it("does not mutate product or variant stock before the canonical sale movement", () => {
    const source = readFileSync(
      join(process.cwd(), "server/storage/order-storage.ts"),
      "utf8",
    );

    const start = source.indexOf("async createOrderSecure(");
    const end = source.indexOf("// Payment Methods", start);

    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);

    const createOrderSecure = source.slice(start, end);

    // In enforce mode the database rejects direct products.stock / variant-stock
    // writes. The order-line INSERT is the only valid sale entry point: its DB
    // trigger appends inventory_movements and the projection trigger updates the
    // storefront stock afterwards.
    expect(createOrderSecure).not.toContain("stock: currentStock - quantity");
    expect(createOrderSecure).not.toContain("variants: updatedVariants");
    expect(createOrderSecure).not.toContain("stock: nextBaseStock");
    expect(createOrderSecure).toContain("await tx.insert(orderItems).values(");
  });
});
