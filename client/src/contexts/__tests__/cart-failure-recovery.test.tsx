import React, { StrictMode } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { CartProvider, useCart } from "../cart-context";
import { syncStorage } from "@/lib/secure-storage";

const auth = vi.hoisted(() => ({ user: { id: "account" } as { id: string } | null, isLoading: false }));
vi.mock("../auth-context", () => ({ useAuth: () => auth }));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));
const product = { id: "p", name: "فلتر", slug: "filter", price: 3549, stock: 10,
  brand: "AQUAVO", rating: 0, reviewCount: 0, category: "filters", thumbnail: "", images: [] };
const serverLine = { id: "line", productId: "p", quantity: 1, product };
let cart: ReturnType<typeof useCart>;
function Consumer() {
  cart = useCart();
  return <p data-testid="cart">{JSON.stringify(cart.items)}</p>;
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
async function loadCart() {
  render(<CartProvider><Consumer /></CartProvider>);
  await waitFor(() => expect(cart.isReady).toBe(true));
}
beforeEach(() => {
  auth.user = { id: "account" };
  localStorage.clear();
  syncStorage.removeItem("cart-v2");
  vi.mocked(fetch).mockImplementation(async () => Response.json([serverLine]));
});
afterEach(() => {
  vi.restoreAllMocks();
  syncStorage.removeItem("cart-v2");
});

describe("cart acknowledgement and network failures", () => {
  it("retains an accepted add when the subsequent cart read loses its connection", async () => {
    await loadCart();
    vi.mocked(fetch).mockImplementation(async (_url, init) => {
      if (init?.method === "POST") return Response.json({ id: "line", quantity: 2 }, { status: 201 });
      throw new TypeError("offline during refresh");
    });
    let added = false;
    await act(async () => { added = await cart.addItem(product); });
    expect(added).toBe(true);
    expect(cart.items).toMatchObject([{ id: "line", quantity: 2 }]);
    expect(vi.mocked(fetch).mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
  });

  it("restores a removed line on connection failure without requiring another read", async () => {
    await loadCart();
    vi.mocked(fetch).mockRejectedValue(new TypeError("offline"));
    await act(async () => { await cart.removeItem("line"); });
    expect(cart.items).toMatchObject([{ id: "line", quantity: 1 }]);
  });

  it.each([[200, 500, 2], [500, 200, 3], [500, 500, 1]])("serializes rapid quantities and preserves acknowledgement across statuses %s / %s", async (firstStatus, secondStatus, finalQuantity) => {
    await loadCart();
    const first = deferred<Response>();
    const quantities: number[] = [];
    vi.mocked(fetch).mockImplementation(async (_url, init) => {
      if (init?.method !== "PUT") return Response.json({});
      quantities.push(JSON.parse(String(init.body)).quantity as number);
      return quantities.length === 1 ? first.promise : Response.json({}, { status: secondStatus });
    });
    let firstWrite: unknown;
    let secondWrite: unknown;
    act(() => {
      firstWrite = cart.updateQuantity("line", 2);
      secondWrite = cart.updateQuantity("line", 3);
    });
    expect(cart.items[0].quantity).toBe(3);
    await waitFor(() => expect(quantities).toEqual([2]));
    await act(async () => {
      first.resolve(Response.json({}, { status: firstStatus }));
      await Promise.all([firstWrite, secondWrite]);
    });
    expect(quantities).toEqual([2, 3]);
    expect(cart.items[0].quantity).toBe(finalQuantity);
  });

  it("does not pretend a rejected clear succeeded", async () => {
    await loadCart();
    vi.mocked(fetch).mockResolvedValue(Response.json({}, { status: 503 }));
    await act(async () => { await cart.clearCart(); });
    expect(cart.items).toMatchObject([{ id: "line", quantity: 1 }]);
  });

  it("keeps guest add, quantity, refresh and removal usable with blocked storage", async () => {
    auth.user = null;
    vi.spyOn(localStorage, "setItem").mockImplementation(() => { throw new DOMException("Blocked", "SecurityError"); });
    vi.spyOn(localStorage, "getItem").mockImplementation(() => { throw new DOMException("Blocked", "SecurityError"); });
    vi.spyOn(localStorage, "removeItem").mockImplementation(() => { throw new DOMException("Blocked", "SecurityError"); });
    vi.mocked(fetch).mockResolvedValue(Response.json({}));
    render(<StrictMode><CartProvider><Consumer /></CartProvider></StrictMode>);
    await act(async () => { await cart.addItem(product); await cart.addItem(product); });
    expect(cart.items[0].quantity).toBe(2);
    await act(async () => { await cart.updateQuantity("p-default", 3); await cart.refetchCart(); });
    expect(cart.items[0].quantity).toBe(3);
    await act(async () => { await cart.removeItem("p-default"); });
    expect(screen.getByTestId("cart")).toHaveTextContent("[]");
  });
});
