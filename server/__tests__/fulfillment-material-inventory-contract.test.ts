import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("fulfillment material inventory source contract", () => {
  it("keeps inventory at order-fulfillment scope and never writes products.packaging_cost", () => {
    const service = read("server/services/fulfillment-service.ts");
    const inventory = read("server/services/preparation-inventory-service.ts");
    expect(service).toContain("orderFulfillmentLines");
    expect(service).toContain("packagingInventoryMovements");
    expect(service).toContain("trackedIdSet.has(l.materialId)");
    expect(`${service}\n${inventory}`).not.toMatch(/products\.packaging_cost|products\.packagingCost/);
  });

  it("draft shortage projection explicitly filters by stockTracked", () => {
    const draft = read("server/services/fulfillment-draft-service.ts");
    expect(draft).toContain("stockTracked: fulfillmentMaterials.stockTracked");
    expect(draft).toContain("if (!trackedIds.has(materialId)) continue");
  });

  it("uses append-only ledger adjustments and exact target-minus-ledger stocktake", () => {
    const inventory = read("server/services/preparation-inventory-service.ts");
    expect(inventory).toContain("const adjustment = input.targetQuantity - before");
    expect(inventory).toContain('movementType: "correction"');
    expect(inventory).not.toMatch(/UPDATE\s+packaging_inventory_movements/i);
    expect(inventory).not.toMatch(/DELETE\s+FROM\s+packaging_inventory_movements/i);
  });

  it("preserves existing event/line idempotency for one-time deductions", () => {
    const service = read("server/services/fulfillment-service.ts");
    expect(service).toContain("findByIdempotencyKey");
    expect(service).toContain("lineId");
    expect(service).toContain("idempotencyKey: `use:${eventId}:${lineId}`");
  });

  it("prevents fulfillment reversal from restocking shipped/delivered/returned orders", () => {
    const service = read("server/services/fulfillment-service.ts");
    expect(service).toContain('["shipped", "delivered", "returned"]');
    expect(service).toContain("REVERSAL_INVALID_AFTER_SHIPMENT");
  });

  it("exposes Arabic inventory controls for stocktake, receipt, tracking and movement history", () => {
    const panel = read("client/src/components/admin/packaging/preparation-inventory-panel.tsx");
    expect(panel).toContain("جرد / تحديد الكمية الحالية");
    expect(panel).toContain("إضافة مخزون");
    expect(panel).toContain("سجل الحركات");
    expect(panel).toContain("تفعيل التتبع وحفظ الكمية");
  });
});
