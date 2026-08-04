import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  new URL("../../migrations/0062_accounting_cod_refusal_and_store_credit.sql", import.meta.url),
  "utf8",
);

describe("migration 0062 COD refusal contract", () => {
  it("forces every financial loss field to zero for rejected delivery", () => {
    expect(sql).toContain("IF NEW.type = 'rejected_delivery'");
    for (const assignment of [
      "NEW.refund_amount := 0",
      "NEW.delivery_cost_loss := 0",
      "NEW.return_shipping_cost := 0",
      "NEW.packaging_loss := 0",
      "NEW.product_write_off_amount := 0",
      "NEW.cogs_loss := 0",
      "NEW.restocked := true",
    ]) {
      expect(sql).toContain(assignment);
    }
  });

  it("requires affected product quantities before a refusal can be verified", () => {
    expect(sql).toContain("COD_REFUSAL_ITEMS_REQUIRED");
    expect(sql).toContain("jsonb_array_length");
  });

  it("creates a derived immutable partial-use store-credit ledger", () => {
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.customer_credit_accounts");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.customer_credit_entries");
    expect(sql).toContain("CREATE OR REPLACE VIEW public.v_customer_credit_balances");
    expect(sql).toContain("CUSTOMER_CREDIT_INSUFFICIENT");
    expect(sql).toContain("CUSTOMER_CREDIT_LEDGER_IMMUTABLE");
    expect(sql).not.toMatch(/expires_at|expiry|expiration/i);
  });

  it("keeps the old SKU stable but corrects its business meaning", () => {
    expect(sql).toContain("WHERE sku = 'PRICE_LABEL'");
    expect(sql).toContain("ستكر هدية للمنتج");
    expect(sql).toContain("ليس ملصق سعر");
  });
});
