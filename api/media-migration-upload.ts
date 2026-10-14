/**
 * One-time AQUAVO product gallery migration endpoint.
 * Requires a short-lived secret provisioned in Vercel Production.
 * Uploads only approved product sources. Never writes Neon directly.
 * Remove endpoint and secret after verified migration.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHash, timingSafeEqual } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";

const CLOUD = "dyczh8ogv";
const ALLOWED: Record<string, number> = {
  "yll-053-054": 6,
  "yee-3602": 6,
  "yee-10080": 5,
  "yeb-751": 6,
  "ysq-730": 6,
  "c6-1017": 6,
  "ykl-086": 6,
};
function safeEqual(a: string, b: string): boolean {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader("Cache-Control", "no-store, private");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  const secret = process.env.AQUAVO_MEDIA_MIGRATION_TOKEN;
  if (!secret || !safeEqual(String(req.headers.authorization || ""), "Bearer " + secret)) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const configured = process.env.CLOUDINARY_CLOUD_NAME === CLOUD &&
    Boolean(process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
  if (req.method === "GET") {
    res.status(configured ? 200 : 503).json({
      configured, cloudMatches: process.env.CLOUDINARY_CLOUD_NAME === CLOUD,
      databaseAvailable: Boolean(process.env.DATABASE_URL),
    });
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" }); return;
  }
  if (!configured) {
    res.status(503).json({ error: "Cloudinary credentials unavailable to runtime" }); return;
  }
  try {
    const data = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const slug = String(data?.slug ?? "");
    const number = Number(data?.position);
    const sha = String(data?.sha256 ?? "").toLowerCase();
    const width = Number(data?.width);
    const height = Number(data?.height);
    const format = String(data?.format ?? "").toLowerCase();
    const base64 = String(data?.base64 ?? "");
    if (!Object.prototype.hasOwnProperty.call(ALLOWED, slug) ||
      !Number.isInteger(number) || number < 1 || number > ALLOWED[slug] ||
      !/^[a-f0-9]{64}$/.test(sha) ||
      !Number.isInteger(width) || width < 1 || width > 10000 ||
      !Number.isInteger(height) || height < 1 || height > 10000 ||
      !["png", "jpeg", "webp"].includes(format) ||
      base64.length < 100 || base64.length > 4_100_000 ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
      res.status(400).json({ error: "Invalid original image manifest" }); return;
    }
    const bytes = Buffer.from(base64, "base64");
    if (bytes.length < 100 || bytes.length > 3_200_000 ||
      createHash("sha256").update(bytes).digest("hex") !== sha) {
      res.status(400).json({ error: "Original image checksum mismatch" }); return;
    }
    const id = `aquavo/products/yee/${slug}/source-${String(number).padStart(2, "0")}-${sha.slice(0, 20)}`;
    cloudinary.config({ cloud_name: CLOUD,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET, secure: true });
    let image: any;
    try {
      image = await cloudinary.api.resource(id, { resource_type: "image" });
    } catch (error: any) {
      if (error?.http_code !== 404 && error?.error?.http_code !== 404) throw error;
      image = await cloudinary.uploader.upload(
        `data:image/${format};base64,${base64}`,
        { public_id: id, resource_type: "image", overwrite: false,
          unique_filename: false },
      );
    }
    if (image.width !== width || image.height !== height ||
      !String(image.secure_url || "").startsWith(`https://res.cloudinary.com/${CLOUD}/image/upload/`)) {
      res.status(422).json({ error: "Cloudinary image dimensions/origin mismatch" }); return;
    }
    const check = await fetch(image.secure_url, { method: "HEAD", signal: AbortSignal.timeout(15000) });
    if (!check.ok || !String(check.headers.get("content-type") || "").startsWith("image/")) {
      res.status(502).json({ error: "Cloudinary asset not reachable" }); return;
    }
    res.status(200).json({ slug, position: number, sha256: sha,
      url: image.secure_url, width: image.width, height: image.height,
      publicId: id });
  } catch (error) {
    console.error("Media migration upload failed:", error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: "Image upload failed" });
  }
}
