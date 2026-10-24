interface GallerySource { image?: string | null; thumbnail?: string | null; images?: string[] | null; }
interface GalleryVariant extends GallerySource { isArchived?: boolean; }
/** A declared variant gallery is authoritative, including an explicit empty one. */
export function getVariantGallery(product: GallerySource, selected?: GalleryVariant | null, variants?: GalleryVariant[]): string[] {
  const clean = (values: (string | null | undefined)[]) => Array.from(new Set(values.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)));
  if (selected?.isArchived) return [];
  if (selected && Array.isArray(selected.images)) return clean(selected.images);
  if (!selected && variants?.some(v => !v.isArchived && Array.isArray(v.images))) {
    // Preview one type only; this does not select a purchase option.
    const first = variants.find(v => !v.isArchived);
    return first && Array.isArray(first.images) ? clean(first.images) : [];
  }
  const fallback = product.images?.length ? product.images : [product.thumbnail || product.image];
  return clean(selected?.image ? [selected.image, ...fallback] : fallback);
}
