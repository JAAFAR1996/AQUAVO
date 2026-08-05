import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const readMigration = (name: string) =>
  readFileSync(join(root, "migrations", name), "utf8");

describe("Accounting V2 P0 migration contracts", () => {
  it("blocks delivery before exact product and fulfillment snapshots", () => {
    const sql = readMigration("0068_accounting_delivery_readiness_guard.sql");

    expect(sql).toContain("assert_order_ready_for_accounting_delivery");
    expect(sql).toContain("orders_accounting_delivery_readiness_guard");
    expect(sql).toContain("BEFORE UPDATE OF status");
    expect(sql).toContain("ACCOUNTING_DELIVERY_BLOCKED_PRODUCT_COST");
    expect(sql).toContain("ACCOUNTING_DELIVERY_BLOCKED_FULFILLMENT_MISSING");
    expect(sql).toContain("ACCOUNTING_DELIVERY_BLOCKED_FULFILLMENT_INCOMPLETE");
  });

  it("canonicalizes return identity and sale-time COGS in the database", () => {
    const sql = readMigration("0069_accounting_return_integrity.sql");

    expect(sql).toContain("RETURN_VARIANT_REQUIRED");
    expect(sql).toContain("RETURN_QUANTITY_EXCEEDS_ORDER");
    expect(sql).toContain("'orderItemId',v_item.id");
    expect(sql).toContain("'variantId',v_variant");
    expect(sql).toContain("'cogsAtTime',v_unit_cogs");
    expect(sql).toContain("NEW.product_write_off_amount:=0");
    expect(sql).toContain("NEW.cogs_loss:=0");
  });

  it("restores inventory value only for sellable returns", () => {
    const sql = readMigration("0069_accounting_return_integrity.sql");

    expect(sql).toContain("'1200',v_restock_cogs");
    expect(sql).toContain("'4000',v_restock_cogs");
    expect(sql).not.toContain("'1200',v_inventory_loss");
    expect(sql).not.toContain("COALESCE(NEW.cogs_loss,0)");
  });

  it("backs official finance metrics with the immutable ledger", () => {
    const sql = readMigration("0070_accounting_ledger_backed_views.sql");

    expect(sql).toContain("accounting_period_account_balance");
    expect(sql).toContain("''4000''::text) AS cogs");
    expect(sql).toContain("''5100''::text) AS fulfillment_cost");
    expect(sql).toContain("''4100''::text) AS sales_returns");
    expect(sql).toContain("''4200''::text) AS actual_return_loss");
    expect(sql).toContain("f.product_revenue-");
    expect(sql).toContain("f.delivery_subsidy-");
    expect(sql).toContain("SELECT SUM(e.actual_cost)");
  });
});
