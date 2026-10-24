import { isVariantActive } from "@shared/variant-commerce";

interface ContentVariant {
  id: string;
  label: string;
  isArchived?: boolean;
  specifications?: Record<string, unknown>;
}
interface ContentProduct {
  slug: string;
  name: string;
  description?: string;
  specifications?: Record<string, unknown>;
  hasVariants?: boolean;
  variants?: ContentVariant[] | null;
}

// These are reviewed corrections for two catalog families, NOT a general-purpose
// name scrubber. Their canonical copy describes the original size only.
// No new material, compatibility or performance claims are synthesized here.
const ORIGINAL_STREAM_GRAIN = /[2٢۲]\s*[–—-]\s*[6٦۶]\s*(?:ملم|مم|mm|میلیمەتر)/iu;
const ORIGINAL_STREAM_SUFFIX = /\s*[—–-]\s*[2٢۲]\s*[–—-]\s*[6٦۶]\s*(?:ملم|مم|mm|میلیمەتر)\s*$/iu;

const ORIGINAL_COTTON_SIZE = /[3٣۳][0٠۰]\s*[×x]\s*[5٥۵][0٠۰]\s*(?:سم|cm|سانتیمەتر)/iu;
const ORIGINAL_COTTON_SUFFIX = /\s*[—–-]\s*[3٣۳][0٠۰]\s*[×x]\s*[5٥۵][0٠۰]\s*(?:سم|cm|سانتیمەتر)\s*$/iu;

const CONTENT_POLICIES = {
  "houyi-stream-sand": { conflict: ORIGINAL_STREAM_GRAIN, suffix: ORIGINAL_STREAM_SUFFIX, dimensionKeys: ["حجم الحبيبات", "المقاس"], outputKey: "حجم الحبيبات", useLabel: false },
  "houyi-white-cotton": { conflict: ORIGINAL_COTTON_SIZE, suffix: ORIGINAL_COTTON_SUFFIX, dimensionKeys: ["القياس", "المقاس"], outputKey: "القياس", useLabel: true },
} as const;

export function getSelectedVariantContent(product: ContentProduct, selected?: ContentVariant | null) {
  const original = {
    name: product.name,
    description: product.description ?? "",
    specifications: product.specifications ?? {},
  };
  const policy = Object.hasOwn(CONTENT_POLICIES, product.slug)
    ? CONTENT_POLICIES[product.slug as keyof typeof CONTENT_POLICIES]
    : undefined;
  if (!policy || !product.hasVariants) return original;

  // Resolve against the current product, not a stale selection from navigation
  // or an archived historical option. Never infer dimensions from option IDs.
  const current = selected && product.variants?.find(variant => variant.id === selected.id && isVariantActive(variant));
  const rawSize = current?.specifications?.[policy.outputKey] ?? current?.specifications?.["المقاس"];
  const size = typeof rawSize === "string" ? rawSize.trim() : "";
  // The original copy remains valid when its explicitly declared option is selected.
  if (size && policy.conflict.test(size)) return original;
  const name = product.name.replace(policy.suffix, "");
  const specifications: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(product.specifications ?? {})) {
    if (policy.dimensionKeys.some(dimensionKey => key === dimensionKey)) continue;
    if (typeof value === "string" && policy.conflict.test(value)) continue;
    if (Array.isArray(value)) {
      specifications[key] = value.filter(item => typeof item !== "string" || !policy.conflict.test(item));
    } else if (key === "labelled" && value && typeof value === "object") {
      // Translated specification labels carry their own values; do not leave
      // the original option's dimension behind in an English/Kurdish table.
      specifications[key] = Object.fromEntries(Object.entries(value).filter(([specKey, entry]) =>
        !policy.dimensionKeys.some(dimensionKey => specKey === dimensionKey) &&
        !(entry && typeof entry === "object" && "value" in entry && typeof entry.value === "string" && policy.conflict.test(entry.value))));
    } else {
      specifications[key] = value;
    }
  }
  if (size) specifications[policy.outputKey] = size;
  // Cotton's invoice dimensions have no declared unit. Keep the explicit
  // uncertainty alongside them; neither infer centimeters nor drop the qualifier.
  const sizeNote = current?.specifications?.["بيان المقاس"];
  if (policy.useLabel && typeof sizeNote === "string" && sizeNote.trim()) {
    specifications["بيان المقاس"] = sizeNote;
  }
  const titleSize = policy.useLabel ? current?.label.trim() : size;
  // Omit whole conflicting sentences rather than transforming the parent's
  // measurement-specific claim into an unverified claim for another option.
  const description = (product.description ?? "")
    .split(/(?<=[.!؟])\s+|\n+/u)
    .filter(sentence => !policy.conflict.test(sentence))
    .join("\n\n");
  return { name: titleSize ? `${name} — ${titleSize}` : name, description, specifications };
}
