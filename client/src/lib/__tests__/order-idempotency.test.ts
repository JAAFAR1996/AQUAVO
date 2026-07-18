import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearOrderIdempotencyKey, getOrderIdempotencyKey } from "../order-idempotency";

describe("checkout idempotency key", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("reuses one UUID for retries of the same cart", () => {
    const first = getOrderIdempotencyKey("product-a:1");
    const retry = getOrderIdempotencyKey("product-a:1");
    expect(retry).toBe(first);
    expect(first).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it("rotates the key when the cart changes or an order completes", () => {
    const first = getOrderIdempotencyKey("product-a:1");
    expect(getOrderIdempotencyKey("product-a:2")).not.toBe(first);
    const second = getOrderIdempotencyKey("product-a:2");
    clearOrderIdempotencyKey();
    expect(getOrderIdempotencyKey("product-a:2")).not.toBe(second);
  });
});
