import { afterEach, describe, expect, it } from "vitest";
import { getInventoryLedgerMode } from "../server/services/inventory-ledger.js";
import { isPaymentLedgerEnabled } from "../server/services/payment-ledger.js";

const originalInventoryMode = process.env.INVENTORY_LEDGER_MODE;
const originalPaymentMode = process.env.PAYMENT_LEDGER_ENABLED;

afterEach(() => {
  if (originalInventoryMode === undefined) delete process.env.INVENTORY_LEDGER_MODE;
  else process.env.INVENTORY_LEDGER_MODE = originalInventoryMode;

  if (originalPaymentMode === undefined) delete process.env.PAYMENT_LEDGER_ENABLED;
  else process.env.PAYMENT_LEDGER_ENABLED = originalPaymentMode;
});

describe("database repair feature flags", () => {
  it("keeps the inventory ledger off when unset or invalid", () => {
    delete process.env.INVENTORY_LEDGER_MODE;
    expect(getInventoryLedgerMode()).toBe("off");

    process.env.INVENTORY_LEDGER_MODE = "unexpected";
    expect(getInventoryLedgerMode()).toBe("off");
  });

  it("accepts only the explicit inventory modes", () => {
    process.env.INVENTORY_LEDGER_MODE = "shadow";
    expect(getInventoryLedgerMode()).toBe("shadow");

    process.env.INVENTORY_LEDGER_MODE = "ENFORCE";
    expect(getInventoryLedgerMode()).toBe("enforce");
  });

  it("keeps the payment ledger disabled unless explicitly true", () => {
    delete process.env.PAYMENT_LEDGER_ENABLED;
    expect(isPaymentLedgerEnabled()).toBe(false);

    process.env.PAYMENT_LEDGER_ENABLED = "1";
    expect(isPaymentLedgerEnabled()).toBe(false);

    process.env.PAYMENT_LEDGER_ENABLED = "TRUE";
    expect(isPaymentLedgerEnabled()).toBe(true);
  });
});
