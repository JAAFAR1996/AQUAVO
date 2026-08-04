import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  new URL("../../migrations/0063_accounting_cod_refusal_and_store_credit.sql", import.meta.url),
  "utf8",
);
const rollback = readFileSync(
  new URL("../../migrations/0063_accounting_cod_refusal_and_store_credit_rollback.sql", import.meta.url),
  "utf8",
);

describe("migration 0063 COD refusal contract", () => {
  it("forces every financial loss field to zero for rejected delivery", () => {
    expect(sql).toMatch(/IF NEW\.type\s*=\s*'rejected_delivery'/);
    for (const field of [
      "refund_amount",
      "delivery_cost_loss",
      "return_shipping_cost",
      "packaging_loss",
      "product_write_off_amount",
      "cogs_loss",
    ]) {
      expect(sql).toMatch(new RegExp(`NEW\\.${field}\\s*:=\\s*0`));
    }
    expect(sql).toMatch(/NEW\.restocked\s*:=\s*true/);
  });

  it("requires item quantities and an actual carrier-refusal status before verification", () => {
    expect(sql).toContain("COD_REFUSAL_ITEMS_REQUIRED");
    expect(sql).toContain("COD_REFUSAL_STATUS_REQUIRED");
    expect(sql).toContain("jsonb_array_length");
    expect(sql).toContain("order_inventory_custody_events");
  });

  it("restores sellable stock at refusal and records physical custody separately", () => {
    expect(sql).toContain("carrier_return_pending");
    expect(sql).toContain("main_received");
    expect(sql).toContain("sellable_restored_at_refusal");
    expect(sql).toContain("order_reversal:");
    expect(sql).toContain("ON CONFLICT(idempotency_key) DO NOTHING");
    expect(sql).toContain("v_order_inventory_custody_latest");
    expect(sql).toContain("INVENTORY_CUSTODY_IMMUTABLE");
  });

  it("makes the order-status reversal the only inventory writer for COD refusals", () => {
    expect(sql).toContain("CREATE OR REPLACE FUNCTION public.apply_verified_return_inventory()");
    expect(sql).toMatch(/IF NEW\.type\s*=\s*'rejected_delivery' THEN\s*RETURN NEW/);
    expect(sql).toContain("v_cod_refusal_inventory_exceptions");
  });

  it("creates a derived immutable partial-use store-credit ledger", () => {
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.customer_credit_accounts");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.customer_credit_entries");
    expect(sql).toContain("CREATE OR REPLACE VIEW public.v_customer_credit_balances");
    expect(sql).toContain("CUSTOMER_CREDIT_INSUFFICIENT");
    expect(sql).toContain("CUSTOMER_CREDIT_LEDGER_IMMUTABLE");
    expect(sql).toContain("'2300','أرصدة الزبائن','liability'");
    expect(sql).toContain("accounting_status text NOT NULL DEFAULT 'pending'");
    expect(sql).not.toMatch(/expires_at|expiry|expiration/i);
  });

  it("keeps the old SKU stable but corrects its business meaning", () => {
    expect(sql).toContain("WHERE sku = 'PRICE_LABEL'");
    expect(sql).toContain("ستكر هدية للمنتج");
    expect(sql).toContain("ليس ملصق سعر");
  });

  it("rollback restores post-0062 timing and the original return-event writer", () => {
    expect(rollback).toContain("NEW.status NOT IN ('cancelled','rejected_returned','returned')");
    expect(rollback).toContain("CREATE OR REPLACE FUNCTION public.apply_verified_return_inventory()");
    expect(rollback).toContain("rolled back to post-0062 behavior");
  });
});
