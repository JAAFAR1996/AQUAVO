import { inArray } from "drizzle-orm";
import { products, type Product } from "../../shared/schema.js";
import { canonicalProductGallery } from "../../shared/product-gallery.js";
import type { getDb } from "../db.js";

type Db = NonNullable<ReturnType<typeof getDb>>;
type ProductImages = Pick<Product, "id" | "images" | "thumbnail" | "variants">;

export interface OrderItemImageInput {
  productId?: string | null;
  variantId?: string | null;
  image?: string | null;
}

function storedImage(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Resolve display metadata without changing any historical order snapshots. */
export function resolveOrderItemImage(item: OrderItemImageInput, product?: ProductImages): string {
  const snapshotImage = storedImage(item.image);
  if (snapshotImage) return snapshotImage;
  if (!product || product.id !== item.productId) return "";

  if (item.variantId) {
    const variants = Array.isArray(product.variants) ? product.variants : [];
    const variant = variants.find((candidate) => candidate.id === item.variantId);
    if (variant) {
      // An explicit gallery, including [], is authoritative. An archived variant
      // can still identify a historical order line and retain its verified photo.
      if (Array.isArray(variant.images)) return canonicalProductGallery(variant.images)[0] ?? "";
      const variantImage = storedImage(variant.image);
      if (variantImage) return variantImage;
    } else if (variants.length > 0) {
      // A removed option must not silently inherit another option's photograph.
      return "";
    }
  }

  return canonicalProductGallery(product.images)[0] ?? storedImage(product.thumbnail);
}

/**
 * Call only after admin authorization, with IDs from the returned order rows.
 * This single read includes soft-deleted products for historical display only;
 * it never makes them purchasable or returns stock, prices or costs.
 */
export async function buildOrderItemImageResolver(
  db: Db,
  productIds: Set<string>,
): Promise<(item: OrderItemImageInput) => string> {
  let rows: ProductImages[] = [];
  if (productIds.size > 0) {
    try {
      rows = await db.select({
        id: products.id,
        images: products.images,
        thumbnail: products.thumbnail,
        variants: products.variants,
      }).from(products).where(inArray(products.id, [...productIds]));
    } catch {
      // A missing optional photograph must not prevent admins reading orders.
      console.warn("[AdminOrderImages] Image metadata lookup failed");
    }
  }

  const byId = new Map(rows.map((product) => [product.id, product]));
  return (item) => resolveOrderItemImage(item, item.productId ? byId.get(item.productId) : undefined);
}
