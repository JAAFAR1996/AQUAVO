import { z } from 'zod';
import { getProductPriceDisplay } from '@/lib/product-pricing';
import { isProductComingSoon } from '@shared/product-availability';
import type { Product } from '@/types';

/** Public fields only. Never forward the source object or private cost metadata. */
export type MaterialProductSource = Pick<Product, 'id' | 'slug' | 'name' | 'category'> &
  Partial<Pick<Product, 'subcategory' | 'thumbnail' | 'image' | 'images' | 'price' | 'stock' | 'hasVariants' | 'variants' | 'specifications'>>;
export type MaterialKind = 'sand' | 'stone';
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
  id: string; name: string; href: string; kind: MaterialKind; image: string | null;
  comingSoon: boolean; price: number | null; isFromPrice: boolean;
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
/** Only catalogue categorisation or explicit curated IDs establishes material membership. */
export function adaptMaterialProducts(products: readonly MaterialProductSource[], options: {
  kindsById?: Readonly<Record<string, MaterialKind>>;
  evidenceById?: Readonly<Record<string, MaterialEvidenceInput>>;
} = {}): MaterialCatalogueItem[] {
  const seen = new Set<string>();
  return products.flatMap(product => {
    const kind = options.kindsById?.[product.id] ?? materialSubcategories[product.subcategory?.trim().toLowerCase() ?? ''];
    if (!kind || !product.id?.trim() || !product.slug?.trim() || !product.name?.trim() || seen.has(product.id)) return [];
    seen.add(product.id);
    const image = [product.thumbnail, product.image, ...(product.images ?? [])].find(value => imageUrl.safeParse(value).success)?.trim() ?? null;
    const comingSoon = isProductComingSoon(product);
    const pricing = getProductPriceDisplay(product);
    return [{ id: product.id, name: product.name, href: `/products/${encodeURIComponent(product.slug)}`, kind, image,
      comingSoon, price: comingSoon ? null : pricing.price, isFromPrice: pricing.isFromPrice,
      // Parent-level evidence must never be applied to a selectable variant.
      // A future PDP integration needs its own explicit variant-identity contract.
      ...verifiedMaterialEvidence(product.id, product.hasVariants ? undefined : options.evidenceById?.[product.id]) }];
  });
}
