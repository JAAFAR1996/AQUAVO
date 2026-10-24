import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("../db.js", () => ({ getDb: vi.fn() }));
vi.mock("../services/product-cost-snapshot.js", () => ({ lockProductRowForUpdate: vi.fn() }));
import { getDb } from "../db.js";
import { lockProductRowForUpdate } from "../services/product-cost-snapshot.js";
import { InvoiceStorage } from "../storage/invoice-storage.js";

describe("invoice draft variant validation before sharing", () => {
  beforeEach(() => vi.clearAllMocks());
  function setup(variantId: string | null, variant: Record<string, unknown>, initialVariantId = variantId) {
    const draft = { id: "draft", status: "draft", items: [{ productId: "product", variantId, quantity: 1 }] };
    const update = vi.fn(() => ({ set: () => ({ where: () => ({ returning: async () => [{ ...draft, status: "sent" }] }) }) }));
    const tx = { select: () => ({ from: () => ({ where: () => ({ for: async () => [draft] }) }) }), update };
    const db = { select: () => ({ from: () => ({ where: async () => [{ ...draft, items: [{ ...draft.items[0], variantId: initialVariantId }] }] }) }), transaction: async (fn: (value: typeof tx) => unknown) => fn(tx) };
    vi.mocked(getDb).mockReturnValue(db as unknown as ReturnType<typeof getDb>);
    vi.mocked(lockProductRowForUpdate).mockResolvedValue({ id: "product", hasVariants: true, variants: [{ id: "v", price: 1000, stock: 5, ...variant }] } as unknown as Awaited<ReturnType<typeof lockProductRowForUpdate>>);
    return { storage: new InvoiceStorage(), update };
  }
  it.each([
    [null, {}], ["v", { isArchived: true }], ["v", { price: null, priceStatus: "pending" }], ["v", { availabilityStatus: "coming_soon" }],
  ] as const)("rejects old or unpurchasable draft option %s %o", async (id, variant) => {
    const { storage, update } = setup(id, variant);
    await expect(storage.send("draft")).rejects.toMatchObject({ status: 409 });
    expect(update).not.toHaveBeenCalled();
  });
  it("validates the locked current draft rather than the stale initial read", async () => {
    const { storage, update } = setup(null, {}, "v");
    await expect(storage.send("draft")).rejects.toMatchObject({ status: 409 });
    expect(update).not.toHaveBeenCalled();
  });
  it("sends a draft with a verified purchasable exact option", async () => {
    const { storage, update } = setup("v", {});
    await expect(storage.send("draft")).resolves.toMatchObject({ status: "sent" });
    expect(update).toHaveBeenCalledOnce();
  });
});
