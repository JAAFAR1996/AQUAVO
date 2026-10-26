import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// A structural guard for a commerce-critical integration point.
// Full transaction rollback requires the Preview DB integration test gate.
const source = readFileSync(resolve(process.cwd(), "server/routes/admin.ts"), "utf8");
const createRoute = source.split('router.post("/products",')[1]?.split('router.patch("/products/:id"')[0] ?? "";
const updateRoute = source.split('router.patch("/products/:id"')[1]?.split('router.delete("/products/:id"')[0] ?? "";

describe("admin product single-save transaction boundary", () => {
  it("creates product, stock movements and audit in one transaction", () => {
    expect(createRoute).toContain("const product = await db.transaction(async (tx: any) => {");
    expect(createRoute).toContain("storage.createProduct(createPayload, tx)");
    expect(createRoute).toContain("setCanonicalProductStock(");
    expect(createRoute).toContain("setCanonicalVariantConfiguration(");
    expect(createRoute).toContain("await tx.insert(auditLogs).values(");
    expect(createRoute).not.toContain("storage.createAuditLog(");
  });

  it("updates product metadata, simple stock and audit in one transaction", () => {
    expect(updateRoute).toContain("const product = await db.transaction(async (tx: any) => {");
    expect(updateRoute).toContain("storage.updateProduct(id, updates, tx)");
    expect(updateRoute).toContain("stockAdjustment = await setCanonicalProductStock(");
    expect(updateRoute).toContain("await tx.insert(auditLogs).values(");
    expect(updateRoute).not.toContain("storage.createAuditLog(");
    expect(updateRoute).toContain('updates.thumbnail = updates.images[0]');
  });

  it("prevents independent stock edits on variant parents", () => {
    expect(updateRoute).toContain("requestedStock !== undefined && existingProduct.hasVariants");
  });
});
