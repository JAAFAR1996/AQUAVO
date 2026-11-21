import { z } from "zod";

export function isSafeReviewImageUrl(value: string): boolean {
  // Encoded delimiters, protocol-relative paths and traversal are not local images.
  if (/^\/(?!\/)[A-Za-z0-9._\-/]+\.(png|jpe?g|webp|gif)$/i.test(value)) {
    return !value.split("/").some(segment => segment === ".." || segment === ".");
  }
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.hash || (url.port && url.port !== "443")) return false;
    const cdn = process.env.CLOUDFLARE_CDN_URL ? new URL(process.env.CLOUDFLARE_CDN_URL) : undefined;
    if (cdn?.protocol === "https:" && url.origin === cdn.origin) {
      const prefix = `${cdn.pathname.replace(/\/$/, "")}/`;
      return url.pathname.startsWith(prefix);
    }
    const cloud = process.env.CLOUDINARY_CLOUD_NAME;
    return !!cloud && /^[A-Za-z0-9_-]+$/.test(cloud)
      && url.hostname === "res.cloudinary.com" && url.pathname.startsWith(`/${cloud}/image/upload/`);
  } catch { return false; }
}

const cleanText = (max: number) => z.string().max(max).transform(value => value
  .replace(/[<>\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim());

const reviewFields = {
  rating: z.number().int().min(1).max(5),
  title: cleanText(120).optional(),
  comment: cleanText(2000).optional(),
  images: z.array(z.string().max(2048).refine(isSafeReviewImageUrl, "ارفع صور المراجعة من الموقع")).max(6).optional(),
};

export const createReviewInput = z.object({
  ...reviewFields,
  productId: z.string().trim().min(1).max(100),
  guestName: cleanText(60).optional(),
}).strict();

export const updateReviewInput = z.object(reviewFields).partial().strict()
  .refine(value => Object.keys(value).length > 0, "حدد التعديل المطلوب");
