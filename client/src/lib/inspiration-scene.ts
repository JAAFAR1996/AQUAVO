import { z } from 'zod';
import { isProductComingSoon } from '@shared/product-availability';
import { isVariantActive, isVariantComingSoon, isVariantPurchasable, positiveVariantPrice } from '@shared/variant-commerce';
import type { InspirationAvailability, InspirationProductSource, InspirationVariantSource } from './inspiration-board';

export type InspirationSceneProductSource = InspirationProductSource & { priceStatus?: unknown; availabilityStatus?: unknown };
export type InspirationSceneRole = 'wood' | 'sand' | 'pump';

/** Reviewed source identity, not a claim that the image is an unedited real photo. */
export const INSPIRATION_SCENE_PROVENANCE = [
  {
    productId: 'aquavo-driftwood-dw-01', variantId: undefined, role: 'wood',
    image: 'https://res.cloudinary.com/dyczh8ogv/image/upload/v1792389560/aquavo/products/transparent-20261019/aquavo-driftwood-dw-01.webp',
    imageWidth: 1254, imageHeight: 1254,
  },
  {
    productId: 'houyi-stream-sand', variantId: '2-6mm', role: 'sand',
    image: 'https://res.cloudinary.com/dyczh8ogv/image/upload/v1792392507/aquavo/products/transparent-20261019/houyi-stream-sand.webp',
    imageWidth: 1254, imageHeight: 1254,
  },
  {
    productId: 'houyi-wave-pump', variantId: undefined, role: 'pump',
    image: 'https://res.cloudinary.com/dyczh8ogv/image/upload/v1792393238/aquavo/products/transparent-20261019/houyi-wave-pump.webp',
    imageWidth: 1254, imageHeight: 1254,
  },
] as const;

export const INSPIRATION_SCENE_BACKGROUND = {
  src: '/images/hero/aquavo-empty-planning-tank-20261025.webp',
  srcSet: '/images/hero/aquavo-empty-planning-tank-20261025-640.webp 640w, /images/hero/aquavo-empty-planning-tank-20261025-1024.webp 1024w, /images/hero/aquavo-empty-planning-tank-20261025.webp 1672w',
  width: 1672, height: 941,
} as const;

/** Verbatim public catalogue warning. This is not installation guidance. */
export const INSPIRATION_SCENE_PUMP_WARNING = 'لا تشغل المضخة خارج الماء';

export interface InspirationSceneItem {
  key: string;
  number: number;
  productId: string;
  variantId?: string;
  role: InspirationSceneRole;
  name: string | null;
  variantLabel: string | null;
  href: string | null;
  /** Exact reviewed transparent catalogue URL, or null. Never a parent fallback. */
  image: string | null;
  imageWidth: number;
  imageHeight: number;
  availability: InspirationAvailability;
  pricePending: boolean;
}

const identity = z.string().trim().min(1);
const publicIdentity = z.object({ id: identity, slug: identity, name: identity });

function availability(product: InspirationSceneProductSource, variant?: InspirationVariantSource): Pick<InspirationSceneItem, 'availability' | 'pricePending'> {
  const source = variant ?? product;
  const pricePending = source.priceStatus === 'pending' || positiveVariantPrice(source.price) === null;
  if (isVariantComingSoon(source) || (!variant && isProductComingSoon(product))) return { availability: 'coming-soon', pricePending };
  if (source.priceStatus === 'pending') return { availability: 'pending-price', pricePending: true };
  if (isVariantPurchasable(source)) return { availability: 'listed', pricePending: false };
  const stock = typeof source.stock === 'string' && source.stock.trim() ? Number(source.stock) : source.stock;
  if (stock === 0) return { availability: 'sold-out', pricePending };
  if (pricePending) return { availability: 'pending-price', pricePending: true };
  return { availability: 'unknown', pricePending: false };
}

/**
 * The three positions are stable compound identities, not suggestions or a kit.
 * Resolve against current public data and shared commerce guards. Only the exact
 * reviewed first image may enter this composition: a changed image must receive
 * a new transparency/identity review, never be silently substituted or cropped.
 * The model does not expose prices, purchase controls, or internal source fields.
 */
export function buildInspirationScene(products: readonly InspirationSceneProductSource[]): InspirationSceneItem[] {
  return INSPIRATION_SCENE_PROVENANCE.map((selection, index) => {
    const empty: InspirationSceneItem = {
      key: JSON.stringify([selection.productId, selection.variantId ?? null]),
      number: index + 1,
      productId: selection.productId,
      variantId: selection.variantId,
      role: selection.role,
      imageWidth: selection.imageWidth,
      imageHeight: selection.imageHeight,
      name: null, variantLabel: null, href: null, image: null,
      availability: 'unavailable', pricePending: false,
    };
    const matches = products.filter(product => product.id === selection.productId);
    if (matches.length !== 1) return empty;
    const product = matches[0];
    const parsed = publicIdentity.safeParse(product);
    if (!parsed.success || product.isArchived === true) return empty;
    let variant: InspirationVariantSource | undefined;
    if (selection.variantId) {
      if (!product.hasVariants) return empty;
      const variants = product.variants?.filter(option => option.id === selection.variantId) ?? [];
      if (variants.length !== 1 || !isVariantActive(variants[0]) || !identity.safeParse(variants[0].label).success) return empty;
      variant = variants[0];
    } else if (product.hasVariants) return empty;
    // Explicitly empty galleries remain empty. A variant never uses parent images.
    const sourceImage = variant
      ? (Array.isArray(variant.images) ? variant.images[0] : variant.image)
      : (Array.isArray(product.images) ? product.images[0] : product.thumbnail ?? product.image);
    return {
      ...empty,
      name: parsed.data.name,
      variantLabel: variant?.label ?? null,
      href: `/products/${encodeURIComponent(parsed.data.slug)}`,
      image: sourceImage === selection.image ? selection.image : null,
      ...availability(product, variant),
    };
  });
}
