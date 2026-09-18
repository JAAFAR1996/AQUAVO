import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const migration = read("migrations/0081_inventory_reconciliation_owner_correction.sql");
const rollback = read("migrations/0081_inventory_reconciliation_owner_correction_rollback.sql");

describe("0081 owner-confirmed inventory reconciliation", () => {
  it("requires operational hardening and preserves tax scope", () => {
    expect(migration).toContain("0081_REQUIRES_ACTIVE_0080_ACCOUNTING_OPERATIONAL_HARDENING");
    expect(migration).toContain("No tax configuration/state changes");
    expect(migration).not.toMatch(/UPDATE\s+public\.tax_/i);
    expect(migration).not.toMatch(/INSERT\s+INTO\s+public\.tax_/i);
  });

  it("pins the six verified YEE costs to immutable valuation evidence", () => {
    expect(migration).toContain("aquavo-current-inventory-baseline-20260808-final");
    for (const [variant, cost] of [
      ["35cube", "12200"],
      ["40cube", "16400"],
      ["40x23", "8920"],
      ["50x27", "13820"],
      ["60x30", "17780"],
      ["60x40", "25800"],
    ]) {
      expect(migration).toContain(`('${variant}'::text,${cost}::numeric)`);
    }
    expect(migration).toContain("0081_YEE_CURRENT_COST_CONFLICT");
    expect(migration).toContain("0081_YEE_COST_CHANGED_AFTER_VERIFIED_BASELINE");
  });

  it("requires exact owner-confirmed quantities and exact 131,480 IQD batch effect", () => {
    for (const [variant, qty] of [
      ["35cube", "2"],
      ["40cube", "2"],
      ["40x23", "0"],
      ["50x27", "1"],
      ["60x30", "1"],
      ["60x40", "2"],
    ]) {
      expect(migration).toContain(`('${variant}'::text,${qty}::numeric)`);
    }
    expect(migration).toContain("INVENTORY-UNIFY-20260817");
    expect(migration).toContain("v_batch_effect<>131480");
    expect(migration).toContain("v_gap<>131480");
  });

  it("posts the correction to inventory and owner equity with zero P&L impact", () => {
    expect(migration).toContain("'1200',131480,0");
    expect(migration).toContain("'3100',0,131480");
    expect(migration).toContain("'classification','opening_equity_inventory_correction'");
    expect(migration).toContain("'pnl_impact_iqd',0");
    expect(migration).toContain("pre_cutover_owned_inventory_valuation_correction");
  });

  it("reconciles owned on-hand plus active unrealized inventory to GL 1200", () => {
    expect(migration).toContain("v_accounting_inventory_asset_reconciliation");
    expect(migration).toContain("unrealized_order_inventory_iqd");
    expect(migration).toContain("lower(COALESCE(o.status,'')) IN ('pending','confirmed','processing','shipped')");
    expect(migration).toContain("COALESCE(o.financially_counted,false)=false");
    expect(migration).toContain("NOT EXISTS(SELECT 1 FROM public.order_accounting_facts f WHERE f.order_id=o.id)");
    expect(migration).toContain("difference_iqd");
    expect(migration).toContain("0081_POST_CORRECTION_INVENTORY_RECONCILIATION_FAILED");
  });

  it("resolves only the known review flag and records an audit adjustment", () => {
    expect(migration).toContain("inventory-reconciliation-bdea88802ce3a265d6bd62e01578b4fe");
    expect(migration).toContain("inventory-unify-20260817-valuation-correction");
    expect(migration).toContain("owner:Jaafar");
    expect(migration).toContain("status='resolved'");
  });

  it("never erases the owner-confirmed financial history on rollback", () => {
    expect(rollback).toContain("0081_IRREVERSIBLE_OWNER_CONFIRMED_FINANCIAL_CORRECTION");
    expect(rollback).not.toMatch(/DELETE\s+FROM\s+public\.journal_/i);
    expect(rollback).not.toMatch(/UPDATE\s+public\.journal_/i);
    expect(rollback).not.toMatch(/DROP\s+TABLE/i);
  });
});
