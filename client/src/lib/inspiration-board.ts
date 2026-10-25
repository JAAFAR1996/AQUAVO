import { z } from 'zod';
import { isProductComingSoon } from '@shared/product-availability';
import { isVariantActive, isVariantComingSoon, isVariantPurchasable, positiveVariantPrice } from '@shared/variant-commerce';
import type { Product, ProductVariant } from '@/types';

export type InspirationVariantSource = Pick<ProductVariant, 'id' | 'label'> & {
  price?: unknown;
  stock?: unknown;
  isArchived?: unknown;
  priceStatus?: unknown;
  availabilityStatus?: unknown;
  image?: string | null;
  images?: readonly string[] | null;
};
/** Public display fields only. Private pricing/cost metadata never enters the board. */
export type InspirationProductSource = Pick<Product, 'id' | 'slug' | 'name'> &
  Partial<Pick<Product, 'thumbnail' | 'image' | 'images' | 'hasVariants' | 'specifications'>> & {
    price?: unknown;
    stock?: unknown;
    isArchived?: unknown;
    variants?: readonly InspirationVariantSource[] | null;
  };

export type InspirationMaterial = 'wood' | 'stone' | 'sand';
export interface InspirationSelection {
  productId: string;
  variantId?: string;
  material: InspirationMaterial;
}

/**
 * Editorial choices verified against the public catalogue on 2026-10-25.
 * This is not a kit, a compatibility assertion, or a mapping to an AI scene.
 * No image, price, size, stock, or alternative option is fabricated here.
 */
export const INSPIRATION_BOARD_SELECTION: readonly InspirationSelection[] = [
  { productId: 'aquavo-driftwood-dw-01', material: 'wood' },
  { productId: 'houyi-volcanic-stone-red', variantId: '3-5cm', material: 'stone' },
  { productId: 'houyi-stream-sand', variantId: '2-6mm', material: 'sand' },
];

export type InspirationAvailability = 'listed' | 'sold-out' | 'coming-soon' | 'pending-price' | 'unknown' | 'unavailable';
export interface InspirationBoardItem {
  /** Compound product + variant identity; never just the family product ID. */
  key: string;
  productId: string;
  variantId?: string;
  material: InspirationMaterial;
  number: number;
  name: string | null;
  variantLabel: string | null;
  href: string | null;
  image: string | null;
  availability: InspirationAvailability;
  pricePending: boolean;
}

const identity = z.string().trim().min(1);
const imagePath = z.string().trim().min(1).refine(value => {
  if (/^\/(?!\/)/.test(value)) return !/[\\\s]/.test(value);
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; }
  catch { return false; }
});
const selectionSchema = z.object({
  productId: identity,
  variantId: identity.optional(),
  material: z.enum(['wood', 'stone', 'sand']),
});
const publicIdentity = z.object({ id: identity, slug: identity, name: identity });

function firstPhoto(values: readonly (string | null | undefined)[]): string | null {
  for (const value of values) {
    const parsed = imagePath.safeParse(value);
    if (parsed.success) return parsed.data;
  }
  return null;
}

/** An explicitly empty option gallery is authoritative; never use its parent's photo. */
function exactPhoto(product: InspirationProductSource, variant?: InspirationVariantSource): string | null {
  if (variant) return Array.isArray(variant.images) ? firstPhoto(variant.images) : firstPhoto([variant.image]);
  return Array.isArray(product.images) ? firstPhoto(product.images) : firstPhoto([product.thumbnail, product.image]);
}

function sourceAvailability(product: InspirationProductSource, variant?: InspirationVariantSource): Pick<InspirationBoardItem, 'availability' | 'pricePending'> {
  const source = variant ?? product;
  const pricePending = variant?.priceStatus === 'pending' || positiveVariantPrice(source.price) === null;
  if (variant ? isVariantComingSoon(variant) : isProductComingSoon(product)) return { availability: 'coming-soon', pricePending };
  if (variant?.priceStatus === 'pending') return { availability: 'pending-price', pricePending: true };
  if (isVariantPurchasable(source)) return { availability: 'listed', pricePending: false };
  const stock = typeof source.stock === 'string' && source.stock.trim() !== '' ? Number(source.stock) : source.stock;
  if (typeof stock === 'number' && Number.isFinite(stock) && stock === 0) return { availability: 'sold-out', pricePending };
  if (pricePending) return { availability: 'pending-price', pricePending: true };
  return { availability: 'unknown', pricePending: false };
}

/**
 * Resolve only the curated exact identities. Unavailable identity slots remain
 * honestly unavailable rather than changing to an unreviewed sibling or product.
 * Reading this model never selects an option, adds to cart, or mutates its source.
 */
export function buildInspirationBoard(
  products: readonly InspirationProductSource[],
  selections: readonly InspirationSelection[] = INSPIRATION_BOARD_SELECTION,
): InspirationBoardItem[] {
  const used = new Set<string>();
  return selections.flatMap((selection, index) => {
    const result = selectionSchema.safeParse(selection);
    if (!result.success) return [];
    const chosen = result.data;
    const key = JSON.stringify([chosen.productId, chosen.variantId ?? null]);
    if (used.has(key)) return [];
    used.add(key);
    const empty: InspirationBoardItem = {
      ...chosen, key, number: index + 1, name: null, variantLabel: null, href: null,
      image: null, availability: 'unavailable', pricePending: false,
    };
    const matches = products.filter(product => product.id === chosen.productId);
    // Ambiguous identity is not evidence of which catalogue image belongs to a product.
    if (matches.length !== 1) return [empty];
    const product = matches[0];
    const parsed = publicIdentity.safeParse(product);
    if (!parsed.success || product.isArchived === true) return [empty];
    let variant: InspirationVariantSource | undefined;
    if (chosen.variantId) {
      if (!product.hasVariants) return [empty];
      const variants = product.variants?.filter(option => option.id === chosen.variantId) ?? [];
      if (variants.length !== 1 || !isVariantActive(variants[0]) || !identity.safeParse(variants[0].label).success) return [empty];
      variant = variants[0];
    } else if (product.hasVariants) {
      // A multi-option product needs an explicitly reviewed option, not a default guess.
      return [empty];
    }
    return [{
      ...empty,
      name: parsed.data.name,
      variantLabel: variant?.label ?? null,
      href: `/products/${encodeURIComponent(parsed.data.slug)}`,
      image: exactPhoto(product, variant),
      ...sourceAvailability(product, variant),
    }];
  });
}
