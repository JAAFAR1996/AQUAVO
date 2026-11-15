/**
 * Resolve immutable invoice display names from the catalogue. Administrator
 * input identifies the item but never supplies the final translated wording.
 */
import type { ManualInvoiceItem } from "../../shared/schema.js";

export interface InvoiceCatalogueProduct {
  id: string;
  name: string;
  variants?: ReadonlyArray<{ id: string; label: string }> | null;
}

export function canonicalizeManualInvoiceItems<T extends ManualInvoiceItem>(
  items: readonly T[],
  catalogue: readonly InvoiceCatalogueProduct[],
  translations: ReadonlyMap<string, Record<string, unknown>> = new Map(),
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
    const translation = translations.get(product.id);
    const name = typeof translation?.name === "string" && translation.name.trim()
      ? translation.name.trim() : product.name;
    const labels = translation?.variantLabels;
    const label = variant && labels && typeof labels === "object"
      ? (labels as Record<string, unknown>)[variant.id] : undefined;
    const variantLabel = typeof label === "string" && label.trim() ? label.trim() : variant?.label;
    return {
      ...item,
      name: variantLabel ? `${name} — ${variantLabel}` : name,
      variantLabel,
    };
  });
}
