/**
 * Product gallery ordering is the single source for the storefront hero image.
 * "thumbnail" is a backwards-compatible projection of images[0].
 */
export function canonicalProductGallery(images: readonly string[] | null | undefined): string[] {
  const unique = new Set<string>();
  for (const raw of images ?? []) {
    if (typeof raw !== "string") continue;
    const image = raw.trim();
    if (image) unique.add(image);
  }
  return [...unique];
}

export function primaryImageFirst(
  images: readonly string[] | null | undefined,
  primary: string | null | undefined,
): string[] {
  const gallery = canonicalProductGallery(images);
  const preferred = typeof primary === "string" ? primary.trim() : "";
  if (!preferred) return gallery;
  return [preferred, ...gallery.filter((image) => image !== preferred)];
}
