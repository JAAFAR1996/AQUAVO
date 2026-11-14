/**
 * Invoice lines are snapshots, but their product names must come from the
 * catalogue's canonical Arabic source, never from a shopper locale cookie or
 * from untrusted browser-supplied translated names. Numeric agreed terms remain
 * untouched. Only drafts are normalized; sent/confirmed history is immutable.
 */
import type { ManualInvoiceItem } from "../../shared/schema.js";

export interface ArabicInvoiceProduct {
  id: string;
  name: string;
  variants?: ReadonlyArray<{ id: string; label: string }> | null;
}

export function canonicalizeManualInvoiceItems<T extends ManualInvoiceItem>(
  items: readonly T[],
  catalogue: readonly ArabicInvoiceProduct[],
): T[] {
  const productsById = new Map(catalogue.map((product) => [product.id, product]));
  return items.map((item) => {
    const product = productsById.get(item.productId);
    if (!product || !product.name.trim()) {
      throw Object.assign(new Error("منتج الفاتورة غير موجود؛ حدّث الاختيار قبل الحفظ"), { status: 409 });
    }
    const variant = item.variantId
      ? product.variants?.find((option) => option.id === item.variantId)
      : undefined;
    if (item.variantId && !variant) {
      throw Object.assign(new Error("خيار المنتج غير موجود؛ حدّث الاختيار قبل الحفظ"), { status: 409 });
    }
    const variantLabel = variant?.label ?? undefined;
    return {
      ...item,
      name: variantLabel ? `${product.name} — ${variantLabel}` : product.name,
      variantLabel,
    };
  });
}
