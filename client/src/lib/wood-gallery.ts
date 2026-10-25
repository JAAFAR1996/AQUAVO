import { z } from 'zod';
import { getProductPriceDisplay } from '@/lib/product-pricing';
import { isProductComingSoon } from '@shared/product-availability';

/** Public, display-only catalogue fields. Original records are never changed. */
export interface WoodProductSource {
  id: string;
  slug: string;
  name: string;
  thumbnail?: string | null;
  image?: string | null;
  images?: readonly string[] | null;
  specifications?: unknown;
  stock?: unknown;
  price?: unknown;
  originalPrice?: unknown;
  hasVariants?: boolean;
  variants?: readonly { stock?: unknown; price?: unknown; isArchived?: unknown }[] | null;
  isArchived?: unknown;
  priceStatus?: unknown;
  availabilityStatus?: unknown;
}

const imageUrl = z.string().trim().min(1).refine(value => /^\/(?!\/)/.test(value) || /^https:\/\//.test(value));
const evidenceIdentity = {
  verified: z.literal(true),
  productId: z.string().min(1),
  pieceCode: z.string().regex(/^DW-\d{2,3}$/),
  source: z.string().trim().min(1),
};
const measurementSchema = z.object({
  ...evidenceIdentity,
  label: z.string().trim().min(1),
  value: z.number().finite().positive(),
  unit: z.enum(['mm', 'cm']),
});
const photoSchema = z.object({
  ...evidenceIdentity,
  src: imageUrl,
  kind: z.literal('actual-product-photo'),
  individuallyTracked: z.literal(true),
  role: z.enum(['ruler', 'second-angle', 'in-use']),
});
export interface WoodEvidenceInput { photos?: unknown; measurements?: unknown }
export type WoodMeasurement = z.infer<typeof measurementSchema>;
export type WoodPhotoRole = 'catalogue' | z.infer<typeof photoSchema>['role'];
export interface WoodPhoto { src: string; role: WoodPhotoRole; source?: string }
export interface WoodGalleryItem {
  id: string;
  name: string;
  pieceCode: string;
  href: string;
  stock: 0 | 1;
  price: number | null;
  availability: 'available' | 'unavailable' | 'coming-soon' | 'pending';
  /** This is a catalogue declaration, not an independent photographic verification. */
  samePieceBasis: 'catalogue-declaration';
  photos: WoodPhoto[];
  measurements: WoodMeasurement[];
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : undefined;
}
function trackedStock(value: unknown): 0 | 1 | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const stock = Number(value);
  return stock === 0 || stock === 1 ? stock : null;
}

/** No inferred scale, generated angles, or generic wood families enter this adapter. */
export function adaptWoodProducts(products: readonly WoodProductSource[], options: {
  evidenceById?: Readonly<Record<string, WoodEvidenceInput>>;
} = {}): WoodGalleryItem[] {
  const seen = new Set<string>();
  return products.flatMap(product => {
    const match = /^aquavo-driftwood-(dw-\d{2,3})$/.exec(product.id);
    const specs = record(product.specifications);
    const stock = trackedStock(product.stock);
    const pieceCode = match?.[1].toUpperCase();
    const model = record(specs?.__model3d);
    // Explicit item identity + the source's same-piece declaration are required.
    // A DW-looking name, generic wood category, stock=1, or model alone is not proof.
    if (!pieceCode || !product.slug?.trim() || !product.name?.trim() || seen.has(product.id)
      || product.hasVariants || product.isArchived === true || stock === null
      || specs?.['رمز القطعة'] !== pieceCode
      || specs?.['ملاحظة'] !== 'الشكل المعروض هو نفس القطعة التي تستلمها'
      || (model?.pieceCode !== undefined && model.pieceCode !== pieceCode)) return [];

    const sources = [...(product.images ?? []), product.thumbnail, product.image];
    const cataloguePhotos: WoodPhoto[] = Array.from(new Set(sources.flatMap(value => {
      const parsed = imageUrl.safeParse(value);
      return parsed.success ? [parsed.data] : [];
    }))).map(src => ({ src, role: 'catalogue' }));
    if (!cataloguePhotos.length) return [];
    seen.add(product.id);
    const evidence = options.evidenceById?.[product.id];
    const measurements = (Array.isArray(evidence?.measurements) ? evidence.measurements : []).flatMap(value => {
      const parsed = measurementSchema.safeParse(value);
      return parsed.success && parsed.data.productId === product.id && parsed.data.pieceCode === pieceCode
        ? [parsed.data] : [];
    });
    const verifiedPhotos = (Array.isArray(evidence?.photos) ? evidence.photos : []).flatMap(value => {
      const parsed = photoSchema.safeParse(value);
      if (!parsed.success || parsed.data.productId !== product.id || parsed.data.pieceCode !== pieceCode) return [];
      // A claimed ruler role must also have a sourced measured value for this item.
      if (parsed.data.role === 'ruler' && !measurements.length) return [];
      return [{ src: parsed.data.src, role: parsed.data.role, source: parsed.data.source }];
    });
    const photos = [...cataloguePhotos];
    const usedRoles = new Set<WoodPhotoRole>();
    for (const photo of verifiedPhotos) {
      if (photos.some(existing => existing.src === photo.src) || usedRoles.has(photo.role)) continue;
      photos.push(photo);
      usedRoles.add(photo.role);
    }
    const comingSoon = isProductComingSoon(product) || (stock === 0 && product.availabilityStatus === 'coming_soon');
    const price = comingSoon ? null : getProductPriceDisplay(product).price;
    const availability = comingSoon ? 'coming-soon' : price === null ? 'pending' : stock === 1 ? 'available' : 'unavailable';
    return [{
      id: product.id, name: product.name, pieceCode, href: `/products/${encodeURIComponent(product.slug)}`,
      stock, price, availability, samePieceBasis: 'catalogue-declaration', photos, measurements,
    } satisfies WoodGalleryItem];
  });
}
