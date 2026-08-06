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

  it("requires exact order-line identity and derives the refund from sale snapshots", () => {
    const sql = readMigration("0071_accounting_return_line_identity_and_refund_guard.sql");
    const rollback = readMigration("0071_accounting_return_line_identity_and_refund_guard_rollback.sql");

    expect(sql).toContain("RETURN_ORDER_ITEM_ID_REQUIRED");
    expect(sql).toContain("WHERE oi.id=v_order_item_id");
    expect(sql).toContain("AND oi.order_id=NEW.order_id");
    expect(sql).toContain("RETURN_PRODUCT_MISMATCH");
    expect(sql).toContain("RETURN_VARIANT_MISMATCH");
    expect(sql).toContain("v_refund_total:=v_refund_total+(v_qty*v_unit_sale)");
    expect(sql).toContain("NEW.refund_amount:=v_refund_total");
    expect(sql).toContain("'priceAtPurchase',v_unit_sale");
    expect(sql).toContain("'cogsAtTime',v_unit_cogs");

    expect(rollback).toContain("0071_ROLLBACK_BLOCKED");
    expect(rollback).toContain("CREATE OR REPLACE FUNCTION public.prepare_verified_return_inventory()");
  });

  it("serializes concurrent return approvals before quantity validation", () => {
    const sql = readMigration("0070_accounting_ledger_backed_views.sql");
    const rollback = readMigration("0070_accounting_ledger_backed_views_rollback.sql");

    expect(sql).toContain("lock_order_return_verification");
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).toContain("hashtextextended('accounting-return:'||NEW.order_id,0)");
    expect(sql).toContain("CREATE TRIGGER order_returns_00_lock_verification");
    expect(sql).toContain("BEFORE UPDATE OF status ON public.order_return_events");
    expect(sql.indexOf("order_returns_00_lock_verification"))
      .toBeLessThan(sql.indexOf("INSERT INTO public.schema_migrations"));

    expect(rollback).toContain("DROP TRIGGER IF EXISTS order_returns_00_lock_verification");
    expect(rollback).toContain("DROP FUNCTION IF EXISTS public.lock_order_return_verification()");
  });

  it("rolls ledger-backed views back across PostgreSQL normalization forms", () => {
    const rollback = readMigration("0070_accounting_ledger_backed_views_rollback.sql");

    for (const account of ["4000", "5100", "4100", "4200"]) {
      expect(rollback).toContain(
        `public.accounting_period_account_balance(m.period_key, ''${account}''::text)`,
      );
      expect(rollback).toContain(
        `accounting_period_account_balance(period_key, ''${account}''::text)`,
      );
    }
    expect(rollback).toContain("pg_get_viewdef");
    expect(rollback).toContain("rollback is based on semantics");
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
