import { z } from 'zod';
import { getProductPriceDisplay } from '@/lib/product-pricing';
import { getSelectedVariantContent } from '@/lib/selected-variant-content';
import { isProductComingSoon } from '@shared/product-availability';
import { isVariantActive, isVariantComingSoon } from '@shared/variant-commerce';
import type { Product } from '@/types';

/** Public fields only. Never forward the source object or private cost metadata. */
export type MaterialProductSource = Pick<Product, 'id' | 'slug' | 'name' | 'category'> &
  Partial<Pick<Product, 'subcategory' | 'thumbnail' | 'image' | 'images' | 'price' | 'stock' | 'hasVariants' | 'variants' | 'specifications'>>;
export type MaterialKind = 'sand' | 'stone';
export type MaterialFactKind = 'grain' | 'size' | 'weight' | 'saleUnit' | 'colour' | 'type' | 'use' | 'note';
export type MaterialAvailability = 'available' | 'comingSoon' | 'unavailable' | 'unknown';
/** Values are exact public catalogue statements, not independently measured evidence. */
export interface MaterialFact { key: string; label: string; value: string; kind: MaterialFactKind }
export interface MaterialCatalogueVariant {
  id: string; label: string; name: string; gallery: string[]; facts: MaterialFact[];
  price: number | null; comingSoon: boolean; availability: MaterialAvailability; isDefault: boolean;
}
const imageUrl = z.string().trim().min(1).refine(value => /^\/(?!\/)/.test(value) || /^https:\/\//.test(value));
const provenance = { verified: z.literal(true), source: z.string().trim().min(1), productId: z.string().trim().min(1) };
const photo = z.object({ ...provenance, src: imageUrl, materialId: z.string().trim().min(1), sampleId: z.string().trim().min(1), captureSetupId: z.string().trim().min(1), kind: z.literal('actual-product-photo') });
const pairSchema = z.object({ dry: photo, wet: photo });
const measureSchema = z.object({ ...provenance, value: z.number().finite().positive(), unit: z.enum(['mm', 'cm', 'm', 'g', 'kg']), label: z.string().trim().min(1) });
const pieceSchema = z.object({ ...provenance, pieceId: z.string().trim().min(1), image: imageUrl, kind: z.literal('actual-product-photo'), individuallyTracked: z.literal(true) });
export type VerifiedMaterialPair = z.infer<typeof pairSchema>;
export type VerifiedMaterialMeasurement = z.infer<typeof measureSchema>;
export type VerifiedMaterialPiece = z.infer<typeof pieceSchema>;
export interface MaterialEvidenceInput { pair?: unknown; measurements?: unknown; piece?: unknown }
export interface MaterialCatalogueItem {
  id: string; name: string; href: string; kind: MaterialKind; image: string | null; gallery: string[];
  facts: MaterialFact[]; variants: MaterialCatalogueVariant[]; hasVariants: boolean; imageNote: string | null;
  comingSoon: boolean; availability: MaterialAvailability; price: number | null; isFromPrice: boolean;
  pair?: VerifiedMaterialPair; measurements: VerifiedMaterialMeasurement[]; piece?: VerifiedMaterialPiece;
}

export function verifiedMaterialEvidence(productId: string, input?: MaterialEvidenceInput) {
  const parsedPair = pairSchema.safeParse(input?.pair);
  const pair = parsedPair.success && parsedPair.data.dry.productId === productId
    && parsedPair.data.wet.productId === productId
    && parsedPair.data.dry.materialId === parsedPair.data.wet.materialId
    && parsedPair.data.dry.sampleId === parsedPair.data.wet.sampleId
    && parsedPair.data.dry.captureSetupId === parsedPair.data.wet.captureSetupId
    && parsedPair.data.dry.src !== parsedPair.data.wet.src ? parsedPair.data : undefined;
  const measurements = (Array.isArray(input?.measurements) ? input.measurements : []).flatMap(value => {
    const result = measureSchema.safeParse(value);
    return result.success && result.data.productId === productId ? [result.data] : [];
  });
  const result = pieceSchema.safeParse(input?.piece);
  const piece = result.success && result.data.productId === productId ? result.data : undefined;
  return { pair, measurements, piece };
}

const materialSubcategories: Record<string, MaterialKind> = {
  sand: 'sand', sands: 'sand', 'رمل': 'sand', 'رمال': 'sand', 'لم': 'sand',
  stone: 'stone', stones: 'stone', rocks: 'stone', 'أحجار': 'stone', 'احجار': 'stone', 'صخور': 'stone', 'بەرد': 'stone',
};
// Exact public catalogue identities keep membership stable when subcategory labels
// are translated. This map is classification only, never a source of SKU facts.
const knownMaterialKinds: Readonly<Record<string, MaterialKind>> = {
  'houyi-volcanic-stone-red': 'stone',
  'houyi-dutch-sand': 'sand',
  'houyi-white-sand': 'sand',
  'houyi-stream-sand': 'sand',
  'houyi-river-sand': 'sand',
  'houyi-south-american-sand-brown': 'sand',
  'houyi-grey-jade-sand-2-5kg': 'sand',
  'houyi-blue-dragon-stone-unpicked': 'stone',
  'houyi-peach-blossom-sand-2-5kg': 'sand',
  'houyi-blue-dragon-stone-pickling': 'stone',
  'houyi-pink-sand-2-5kg': 'sand',
  'houyi-south-american-sand-red': 'sand',
  'houyi-snowflake-white-sand-2-5kg': 'sand',
  'houyi-maple-stone': 'stone',
  'houyi-melaleuca-stone-20-60cm': 'stone',
  'houyi-chaohu-sand-2-5mm': 'sand',
  'houyi-petrified-wood-stone': 'stone',
  'houyi-pine-bark-stone-10-40cm': 'stone',
  'houyi-golden-sand': 'sand',
  'houyi-flake-stone': 'stone',
  'houyi-black-sand': 'sand',
  'houyi-black-slate': 'stone',
  'houyi-black-gold-stone': 'stone',
  'houyi-yellow-golden-stone': 'stone',
  'houyi-tortoise-stone': 'stone',
  'houyi-green-slate': 'stone',
  'houyi-chicken-bone-stone': 'stone',
  'houyi-river-pebbles-1-4cm': 'stone',
  'houyi-myanmar-petrified-wood-stone': 'stone',
  'houyi-volcanic-stone-black': 'stone',
};
const factKinds: Readonly<Record<string, MaterialFactKind>> = {
  'حجم الحبيبات': 'grain', 'مقاس الحبيبات': 'grain', 'grain size': 'grain',
  'حجم القطع': 'size', 'نطاق المقاس': 'size', 'نطاق المقاس التقريبي': 'size', 'المقاس': 'size', 'الحجم': 'size', 'الأبعاد': 'size', 'القياس': 'size', 'size': 'size', 'dimensions': 'size',
  'وزن العبوة': 'weight', 'الوزن': 'weight', 'pack weight': 'weight', 'weight': 'weight',
  'وحدة البيع': 'saleUnit', 'sale unit': 'saleUnit',
  'اللون': 'colour', 'colour': 'colour', 'color': 'colour',
  'النوع': 'type', 'المادة': 'type', 'اسم الصنف': 'type', 'type': 'type', 'material': 'type',
  'أفضل استخدام': 'use', 'best use': 'use',
  'بيان المقاس': 'note', 'size note': 'note',
};
function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
/** Strict allowlist: no invoice, supplier, cost, internal metadata or inferred units. */
export function materialCatalogueFacts(specifications: unknown): MaterialFact[] {
  const specs = asRecord(specifications);
  if (!specs) return [];
  const labelled = asRecord(specs.labelled);
  return Object.entries(specs).flatMap(([key, raw]) => {
    const kind = factKinds[key.trim().toLowerCase()];
    if (!kind || (typeof raw !== 'string' && typeof raw !== 'number') || (typeof raw === 'number' && !Number.isFinite(raw))) return [];
    const value = String(raw).trim();
    if (!value) return [];
    const translation = asRecord(labelled?.[key]);
    return [{ key, kind, label: typeof translation?.label === 'string' && translation.label.trim() ? translation.label.trim() : key,
      value: typeof translation?.value === 'string' && translation.value.trim() ? translation.value.trim() : value }];
  });
}
function catalogueGallery(values: readonly unknown[]): string[] {
  return Array.from(new Set(values.flatMap(value => {
    const result = imageUrl.safeParse(value);
    return result.success ? [result.data] : [];
  })));
}
function availability(stock: unknown, price: number | null, comingSoon: boolean): MaterialAvailability {
  if (comingSoon) return 'comingSoon';
  if ((typeof stock !== 'number' && typeof stock !== 'string') || (typeof stock === 'string' && !stock.trim())) return 'unknown';
  const count = Number(stock);
  if (!Number.isFinite(count) || count < 0) return 'unknown';
  if (count === 0) return 'unavailable';
  return price === null ? 'unknown' : 'available';
}
/** Only catalogue categorisation or explicit curated IDs establishes material membership. */
export function adaptMaterialProducts(products: readonly MaterialProductSource[], options: {
  kindsById?: Readonly<Record<string, MaterialKind>>;
  evidenceById?: Readonly<Record<string, MaterialEvidenceInput>>;
} = {}): MaterialCatalogueItem[] {
  const seen = new Set<string>();
  return products.flatMap(product => {
    const kind = options.kindsById?.[product.id] ?? knownMaterialKinds[product.id] ?? materialSubcategories[product.subcategory?.trim().toLowerCase() ?? ''];
    if (!kind || !product.id?.trim() || !product.slug?.trim() || !product.name?.trim() || seen.has(product.id)) return [];
    seen.add(product.id);
    const seenVariants = new Set<string>();
    const variants = (product.hasVariants ? product.variants ?? [] : []).flatMap(variant => {
      if (!isVariantActive(variant) || !variant.id?.trim() || !variant.label?.trim() || seenVariants.has(variant.id)) return [];
      seenVariants.add(variant.id);
      const comingSoon = isVariantComingSoon(variant);
      const price = comingSoon ? null : getProductPriceDisplay(product, variant).price;
      // A variant's declared gallery, including [], is authoritative. Never borrow
      // parent photos or derive dimensions/weight from legacy technical IDs.
      const gallery = catalogueGallery(Array.isArray(variant.images) ? variant.images : [variant.image]);
      return [{ id: variant.id, label: variant.label, name: getSelectedVariantContent(product, variant).name,
        gallery, facts: materialCatalogueFacts(variant.specifications), price, comingSoon,
        availability: availability(variant.stock, price, comingSoon), isDefault: variant.isDefault === true }];
    });
    const gallery = product.hasVariants && !variants.length ? [] : catalogueGallery([product.thumbnail, product.image, ...(product.images ?? [])]);
    const comingSoon = isProductComingSoon(product);
    const pricing = getProductPriceDisplay(product);
    const price = comingSoon ? null : pricing.price;
    const imageNote = product.specifications?.['ملاحظة الصور'];
    return [{ id: product.id, name: product.name, href: `/products/${encodeURIComponent(product.slug)}`, kind,
      image: gallery[0] ?? null, gallery, facts: materialCatalogueFacts(product.specifications), variants, hasVariants: product.hasVariants === true,
      imageNote: typeof imageNote === 'string' && imageNote.trim() ? imageNote.trim() : null,
      comingSoon, availability: availability(product.stock, price, comingSoon), price, isFromPrice: pricing.isFromPrice,
      // Parent-level evidence must never be applied to a selectable variant.
      ...verifiedMaterialEvidence(product.id, product.hasVariants ? undefined : options.evidenceById?.[product.id]) }];
  });
}
