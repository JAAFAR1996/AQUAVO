const GENERIC_BRANDS = new Set([
  "general",
  "generic",
  "unknown",
  "n/a",
  "na",
  "none",
  "-",
  "بدون علامة",
  "غير محدد",
]);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Returns the customer-facing brand label.
 * Placeholder values such as "General" are intentionally hidden.
 */
export function getProductDisplayBrand(brand: string | null | undefined): string {
  const normalized = (brand ?? "").trim();
  if (!normalized) return "";
  return GENERIC_BRANDS.has(normalized.toLocaleLowerCase("en-US")) ? "" : normalized;
}

/**
 * Removes a duplicated brand token from the CUSTOMER-FACING product name only.
 *
 * Important: keep the canonical DB name untouched for search, analytics, orders,
 * structured data and SEO. This function is presentation-only.
 */
export function getProductDisplayName(
  name: string,
  brand: string | null | undefined,
): string {
  const original = (name ?? "").trim();
  const displayBrand = getProductDisplayBrand(brand);

  if (!original || !displayBrand) return original;

  const escapedBrand = escapeRegExp(displayBrand).replace(/\s+/g, "\\s+");
  const brandToken = new RegExp(
    `(^|[\\s(\\[{:|/—–-])${escapedBrand}(?=$|[\\s)\\]}:|/—–-])`,
    "giu",
  );

  const cleaned = original
    .replace(brandToken, "$1")
    .replace(/\s{2,}/g, " ")
    .replace(/^\s*[—–\-:|/]\s*/u, "")
    .trim();

  return cleaned || original;
}

export function getProductDisplayIdentity(product: {
  name: string;
  brand?: string | null;
}): { name: string; brand: string } {
  const brand = getProductDisplayBrand(product.brand);
  return {
    brand,
    name: getProductDisplayName(product.name, brand),
  };
}
