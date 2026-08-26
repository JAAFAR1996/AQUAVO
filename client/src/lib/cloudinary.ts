/**
 * Cloudinary URL transformation utilities.
 * Transforms Cloudinary URLs to serve optimized images (WebP/AVIF, correct size, auto quality).
 * Non-Cloudinary URLs (local paths, external) are returned unchanged.
 */
import { preferLocalProductCardWebp, preferLocalWebp } from "@/lib/image-variants";

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
  if (!url.includes("res.cloudinary.com")) return preferLocalWebp(url);

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
  const localWebp = preferLocalProductCardWebp(url);
  if (localWebp && localWebp !== url) return localWebp;

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
  const localWebp = preferLocalWebp(url);
  if (localWebp && localWebp !== url) return localWebp;

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
  const localWebp = preferLocalWebp(url);
  if (localWebp && localWebp !== url) return localWebp;

  return optimizeCloudinaryUrl(url, {
    width: 800,
    height: 800,
    quality: "auto:good",
    format: "auto",
    crop: "limit",
  });
}

/**
 * Blog hero image — full-bleed 1200px WebP.
 *
 * Blog images were the one image surface that never went through this module:
 * an article shipped its Cloudinary original, so a 497 KB PNG hero was the LCP
 * element on every post. `c_limit` never upscales, so a smaller original is
 * left at its own size.
 */
export function blogHeroImage(url: string | null | undefined): string {
  return optimizeCloudinaryUrl(url, {
    width: 1200,
    quality: "auto:good",
    format: "auto",
    crop: "limit",
  });
}

/** Blog listing card image — 600px WebP, for the article grid. */
export function blogCardImage(url: string | null | undefined): string {
  return optimizeCloudinaryUrl(url, {
    width: 600,
    quality: "auto",
    format: "auto",
    crop: "limit",
  });
}

/** Lightbox / full-screen image — original size, WebP format + auto quality only */
export function lightboxImage(url: string | null | undefined): string {
  const localWebp = preferLocalWebp(url);
  if (localWebp && localWebp !== url) return localWebp;

  return optimizeCloudinaryUrl(url, {
    quality: "auto:best",
    format: "auto",
  });
}

/**
 * Builds a `srcset` descriptor string across several widths for a Cloudinary
 * URL, so the browser can pick the smallest image that satisfies the actual
 * rendered size instead of always downloading the single fixed-size variant.
 *
 * Returns `undefined` for local/non-Cloudinary assets — those only ship one
 * pre-generated size today, so there is nothing to build a srcset from and
 * callers should omit the `srcSet` attribute rather than pass a single-entry
 * string (which would be equivalent to no srcset at all, but noisier).
 */
function buildCloudinarySrcSet(
  url: string | null | undefined,
  widths: number[],
  options: Omit<ImageOptions, "width" | "height">
): string | undefined {
  if (!url || typeof url !== "string") return undefined;
  if (!url.includes("res.cloudinary.com")) return undefined;
  if (url.includes("/upload/f_") || url.includes("/upload/w_") || url.includes("/upload/q_")) {
    return undefined;
  }

  // Both cardImage and detailImage transform to a square (width === height),
  // so each srcset entry mirrors that 1:1 aspect at its own size.
  return widths
    .map((width) => `${optimizeCloudinaryUrl(url, { ...options, width, height: width })} ${width}w`)
    .join(", ");
}

/** Responsive srcset companion to `cardImage` — 300/400/600/800px variants. */
export function cardImageSrcSet(url: string | null | undefined): string | undefined {
  return buildCloudinarySrcSet(url, [300, 400, 600, 800], {
    quality: "auto",
    format: "auto",
    crop: "pad",
    background: "auto",
  });
}

/** Responsive srcset companion to `detailImage` — 400/600/800/1200px variants. */
export function detailImageSrcSet(url: string | null | undefined): string | undefined {
  return buildCloudinarySrcSet(url, [400, 600, 800, 1200], {
    quality: "auto:good",
    format: "auto",
    crop: "limit",
  });
}
