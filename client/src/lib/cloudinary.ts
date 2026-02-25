/**
 * Cloudinary URL transformation utilities.
 * Transforms Cloudinary URLs to serve optimized images (WebP/AVIF, correct size, auto quality).
 * Non-Cloudinary URLs (local paths, external) are returned unchanged.
 */

type Quality = "auto" | "auto:best" | "auto:good" | "auto:eco" | "auto:low";
type Format = "auto" | "webp" | "avif";
type Crop = "limit" | "fill" | "fit" | "scale" | "thumb" | "pad";

interface ImageOptions {
  width?: number;
  height?: number;
  quality?: Quality;
  format?: Format;
  crop?: Crop;
  gravity?: string;
  background?: string;
}

/**
 * Injects Cloudinary transformation parameters into a Cloudinary URL.
 * Non-Cloudinary URLs are returned as-is.
 */
export function optimizeCloudinaryUrl(
  url: string | null | undefined,
  options: ImageOptions = {}
): string {
  if (!url || typeof url !== "string") return "";
  if (!url.includes("res.cloudinary.com")) return url;

  // Don't double-transform already-transformed URLs
  if (url.includes("/upload/f_") || url.includes("/upload/w_") || url.includes("/upload/q_")) {
    return url;
  }

  const {
    width,
    height,
    quality = "auto",
    format = "auto",
    crop = "limit",
    gravity,
    background,
  } = options;

  const parts: string[] = [`f_${format}`, `q_${quality}`];
  if (width) parts.push(`w_${width}`);
  if (height) parts.push(`h_${height}`);
  if ((width || height) && crop) parts.push(`c_${crop}`);
  if (gravity) parts.push(`g_${gravity}`);
  if (background) parts.push(`b_${background}`);

  const transformStr = parts.join(",");
  return url.replace("/upload/", `/upload/${transformStr}/`);
}

/** Product listing card image — 400×400 WebP, auto quality */
export function cardImage(url: string | null | undefined): string {
  return optimizeCloudinaryUrl(url, {
    width: 400,
    height: 400,
    quality: "auto",
    format: "auto",
    crop: "pad",
    background: "auto",
  });
}

/** Gallery thumbnail image — 120×120 WebP, eco quality */
export function thumbImage(url: string | null | undefined): string {
  return optimizeCloudinaryUrl(url, {
    width: 120,
    height: 120,
    quality: "auto:eco",
    format: "auto",
    crop: "limit",
  });
}

/** Product detail main image — 800×800 WebP, good quality */
export function detailImage(url: string | null | undefined): string {
  return optimizeCloudinaryUrl(url, {
    width: 800,
    height: 800,
    quality: "auto:good",
    format: "auto",
    crop: "limit",
  });
}

/** Lightbox / full-screen image — original size, WebP format + auto quality only */
export function lightboxImage(url: string | null | undefined): string {
  return optimizeCloudinaryUrl(url, {
    quality: "auto:best",
    format: "auto",
  });
}
