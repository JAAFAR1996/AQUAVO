export interface CheckoutLine { productId: string; quantity: number; variantId?: string }
/** Consolidate repeated SKUs and lock products in a deterministic order. */
export function normalizeCheckoutItems(items: CheckoutLine[]): CheckoutLine[] {
  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    throw Object.assign(new Error("Invalid checkout items"), { status: 400 });
  }
  const merged = new Map<string, CheckoutLine>();
  for (const item of items) {
    if (typeof item?.productId !== "string" || !item.productId || !Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw Object.assign(new Error("Invalid checkout quantity"), { status: 400 });
    }
    const variantId = typeof item.variantId === "string" && item.variantId.trim() ? item.variantId : undefined;
    const key = JSON.stringify([item.productId, variantId ?? null]);
    const quantity = (merged.get(key)?.quantity ?? 0) + item.quantity;
    if (quantity > 100) throw Object.assign(new Error("Maximum 100 items per product option"), { status: 400 });
    merged.set(key, { productId: item.productId, quantity, ...(variantId ? { variantId } : {}) });
  }
  return [...merged.values()].sort((a, b) => a.productId.localeCompare(b.productId) || (a.variantId ?? "").localeCompare(b.variantId ?? ""));
}
