import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  join(process.cwd(), "migrations", "0065_accounting_separate_warranty_from_cod_refusal.sql"),
  "utf8",
);

describe("migration 0065 warranty/COD refusal separation", () => {
  it("restores inventory for COD refusal statuses", () => {
    expect(sql).toContain("NEW.status IN ('cancelled','rejected','rejected_carrier','rejected_returned')");
    expect(sql).toContain("carrier_return_pending");
    expect(sql).toContain("sellable_restored_at_refusal");
  });

  it("treats rejected-to-returned as physical receipt only", () => {
    expect(sql).toContain("NEW.status='returned'");
    expect(sql).toContain("OLD.status IN ('rejected','rejected_carrier','rejected_returned')");
    expect(sql).toContain("'physical_receipt_only',NEW.status='returned'");
    expect(sql).toContain("ON CONFLICT(idempotency_key) DO NOTHING");
  });

  it("does not classify delivered-to-returned as a full-order inventory restore", () => {
    expect(sql).not.toContain("NEW.status NOT IN ('cancelled','rejected_returned','returned')");
    expect(sql).toContain("v_restore_inventory boolean:=false");
    expect(sql).toContain("IF NOT v_restore_inventory THEN");
  });

  it("documents that post-delivery warranty uses item-level events", () => {
    expect(sql).toContain("delivered -> returned");
    expect(sql).toContain("item-level verified return events");
  });
});
