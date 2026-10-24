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

// This is a reviewed correction for this catalog family, NOT a general-purpose
// name scrubber. The canonical record describes the original 2–6 mm option.
// No new material, compatibility or performance claims are synthesized here.
const ORIGINAL_STREAM_GRAIN = /[2٢۲]\s*[–—-]\s*[6٦۶]\s*(?:ملم|مم|mm|میلیمەتر)/iu;
const ORIGINAL_STREAM_SUFFIX = /\s*[—–-]\s*[2٢۲]\s*[–—-]\s*[6٦۶]\s*(?:ملم|مم|mm|میلیمەتر)\s*$/iu;

export function getSelectedVariantContent(product: ContentProduct, selected?: ContentVariant | null) {
  const original = {
    name: product.name,
    description: product.description ?? "",
    specifications: product.specifications ?? {},
  };
  if (product.slug !== "houyi-stream-sand" || !product.hasVariants) return original;

  // Resolve against the current product, not a stale selection from navigation
  // or an archived historical option. Never infer dimensions from option IDs.
  const current = selected && product.variants?.find(variant => variant.id === selected.id && isVariantActive(variant));
  const rawSize = current?.specifications?.["حجم الحبيبات"] ?? current?.specifications?.["المقاس"];
  const size = typeof rawSize === "string" ? rawSize.trim() : "";
  // The original copy remains valid when its explicitly declared option is selected.
  if (size && ORIGINAL_STREAM_GRAIN.test(size)) return original;
  const name = product.name.replace(ORIGINAL_STREAM_SUFFIX, "");
  const specifications: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(product.specifications ?? {})) {
    if (key === "حجم الحبيبات" || key === "المقاس") continue;
    if (typeof value === "string" && ORIGINAL_STREAM_GRAIN.test(value)) continue;
    if (Array.isArray(value)) {
      specifications[key] = value.filter(item => typeof item !== "string" || !ORIGINAL_STREAM_GRAIN.test(item));
    } else if (key === "labelled" && value && typeof value === "object") {
      // Translated specification labels carry their own values; do not leave
      // the original option's dimension behind in an English/Kurdish table.
      specifications[key] = Object.fromEntries(Object.entries(value).filter(([specKey, entry]) =>
        specKey !== "حجم الحبيبات" && specKey !== "المقاس" &&
        !(entry && typeof entry === "object" && "value" in entry && typeof entry.value === "string" && ORIGINAL_STREAM_GRAIN.test(entry.value))));
    } else {
      specifications[key] = value;
    }
  }
  if (size) specifications["حجم الحبيبات"] = size;
  // Omit whole conflicting sentences rather than transforming the parent's
  // measurement-specific claim into an unverified claim for another option.
  const description = (product.description ?? "")
    .split(/(?<=[.!؟])\s+|\n+/u)
    .filter(sentence => !ORIGINAL_STREAM_GRAIN.test(sentence))
    .join("\n\n");
  return { name: size ? `${name} — ${size}` : name, description, specifications };
}
