import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const migration = read("migrations/0080_accounting_operational_hardening.sql");
const rollback = read("migrations/0080_accounting_operational_hardening_rollback.sql");
const route = read("server/routes/accounting-v2.ts");
const runner = read("script/apply-accounting-v2-migrations.ts");
const workflow = read(".github/workflows/accounting-v2-production-migrate.yml");

describe("Accounting V3 operational hardening", () => {
  it("requires 0078 and fixes order contribution without reclassifying product revenue", () => {
    expect(migration).toContain("0080_REQUIRES_ACTIVE_0078_ACCOUNTING_EXTERNAL_HANDOFF_HARDENING");
    expect(migration).toContain("f.product_revenue\n      + COALESCE(f.rounding_adjustment,0)\n      - f.cogs_amount");
    expect(migration).not.toContain("UPDATE public.order_accounting_facts");
    expect(migration).not.toContain("UPDATE public.journal_entries");
  });

  it("validates every clean legacy constraint found by the Production audit", () => {
    for (const constraint of [
      "accounting_period_closes_close_type_chk",
      "order_items_cost_confidence_chk",
      "order_items_cost_nonneg",
      "order_items_cost_source_chk",
      "order_items_cost_status_chk",
      "order_items_cost_version_chk",
      "order_items_sale_price_identity_chk",
      "order_items_sale_price_nonneg",
      "order_items_sale_price_provenance_chk",
      "order_items_sale_price_source_chk",
      "orders_coupon_id_coupons_id_fk",
    ]) {
      expect(migration).toContain(constraint);
    }
    expect(migration).toContain("VALIDATE CONSTRAINT");
    expect(migration).toContain("expected_constraints_present");
    expect(migration).toContain("target_constraints_validated");
  });

  it("removes mutation privileges from append-only evidence while preserving insert/select", () => {
    for (const table of [
      "inventory_cost_events",
      "inventory_movements",
      "journal_entries",
      "journal_lines",
      "order_accounting_carrier_corrections",
      "order_accounting_facts",
      "order_accounting_settlements",
      "payment_events",
    ]) {
      expect(migration).toContain(`'${table}'`);
    }
    expect(migration).toContain("REVOKE UPDATE, DELETE ON TABLE public.%I FROM aquavo_runtime");
    expect(migration).toContain("GRANT SELECT, INSERT ON TABLE public.%I TO aquavo_runtime");
    expect(migration).toContain("append_only_acl_hardened");
  });

  it("uses a safety-preserving rollback that does not re-open immutable mutation rights", () => {
    expect(rollback).toContain("Safety-preserving rollback");
    expect(rollback).not.toMatch(/GRANT\s+(UPDATE|DELETE)/i);
    expect(rollback).not.toContain("NOT VALID");
    expect(rollback).toContain("rolled_back_at=now()");
  });

  it("gates runtime health and deployment governance on 0080", () => {
    expect(route).toContain('LATEST_ACCOUNTING_MIGRATION = "0080_accounting_operational_hardening"');
    expect(route).toContain('migrationsThrough: "0080"');
    expect(route).toContain("v_accounting_operational_hardening");
    expect(runner).toContain('"0077_fix_order_accounting_gross_identity_rounding.sql"');
    expect(runner).toContain('"0078_accounting_external_handoff_hardening.sql"');
    expect(runner).toContain('"0080_accounting_operational_hardening.sql"');
    expect(runner).toContain("APPLY_ACCOUNTING_THROUGH_0080");
    expect(workflow).toContain("APPLY_ACCOUNTING_THROUGH_0080");
  });
});
