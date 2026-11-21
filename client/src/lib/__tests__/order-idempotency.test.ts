import { beforeEach, describe, expect, it, vi } from "vitest";
import { clearOrderIdempotencyKey, getOrderIdempotencyKey } from "../order-idempotency";

describe("checkout idempotency key", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
    clearOrderIdempotencyKey();
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
  it("reuses a retry key in memory when browser storage is unavailable", () => {
    vi.spyOn(sessionStorage, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(sessionStorage, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    const first = getOrderIdempotencyKey("guest-order-with-notes");
    expect(getOrderIdempotencyKey("guest-order-with-notes")).toBe(first);
    clearOrderIdempotencyKey();
    expect(getOrderIdempotencyKey("guest-order-with-notes")).not.toBe(first);
  });

});
