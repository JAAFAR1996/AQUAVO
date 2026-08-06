import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration65 = readFileSync(
  path.resolve(process.cwd(), "migrations/0065_accounting_separate_warranty_from_cod_refusal.sql"),
  "utf8",
);
const migration66 = readFileSync(
  path.resolve(process.cwd(), "migrations/0066_accounting_reassert_refusal_inventory_after_0062.sql"),
  "utf8",
);
const rollback66 = readFileSync(
  path.resolve(process.cwd(), "migrations/0066_accounting_reassert_refusal_inventory_after_0062_rollback.sql"),
  "utf8",
);

describe("migration 0065 warranty/COD refusal separation", () => {
  it("restores inventory for COD refusal statuses", () => {
    expect(migration65).toContain("NEW.status IN ('cancelled','rejected','rejected_carrier','rejected_returned')");
    expect(migration65).toContain("carrier_return_pending");
    expect(migration65).toContain("sellable_restored_at_refusal");
  });

  it("treats rejected-to-returned as physical receipt only", () => {
    expect(migration65).toContain("NEW.status='returned'");
    expect(migration65).toContain("OLD.status IN ('rejected','rejected_carrier','rejected_returned')");
    expect(migration65).toContain("'physical_receipt_only',NEW.status='returned'");
    expect(migration65).toContain("ON CONFLICT(idempotency_key) DO NOTHING");
  });

  it("does not classify delivered-to-returned as a full-order inventory restore", () => {
    expect(migration65).not.toContain("NEW.status NOT IN ('cancelled','rejected_returned','returned')");
    expect(migration65).toContain("v_restore_inventory boolean:=false");
    expect(migration65).toContain("IF NOT v_restore_inventory THEN");
  });

  it("documents that post-delivery warranty uses item-level events", () => {
    expect(migration65).toContain("delivered -> returned");
    expect(migration65).toContain("item-level verified return events");
  });

  it("reasserts the canonical 0065 behavior in migration 0066", () => {
    expect(migration66).toContain("v_restore_inventory boolean:=false");
    expect(migration66).toContain("'physical_receipt_only',NEW.status='returned'");
    expect(migration66).toContain("sellable_restored_at_refusal");
    expect(migration66).toContain("0066_accounting_reassert_refusal_inventory_after_0062");
  });

  it("rolls 0066 back to the canonical 0065 function without restoring 0062 behavior", () => {
    expect(rollback66).toContain("0066_ROLLBACK_BLOCKED: migration 0065 must remain active");
    expect(rollback66).toContain("v_restore_inventory boolean:=false");
    expect(rollback66).toContain("'physical_receipt_only',NEW.status='returned'");
    expect(rollback66).toContain("rolled back to canonical 0065 function");
    expect(rollback66).not.toContain("NEW.status NOT IN ('cancelled','rejected_returned','returned')");
  });
});
