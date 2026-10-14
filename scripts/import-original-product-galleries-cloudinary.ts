/**
 * Import AQUAVO's seven original, unresized product galleries to Cloudinary.
 *
 * Prerequisites:
 *   1. Extract AQUAVO_Cloudinary_Originals_41.zip to a local directory.
 *   2. Configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY,
 *      CLOUDINARY_API_SECRET and DATABASE_URL in your local environment.
 *
 * Dry run (no upload, DB update, or deletion):
 *   pnpm exec tsx scripts/import-original-product-galleries-cloudinary.ts --root /path/to/extracted
 *
 * Apply with backups and image verification:
 *   pnpm exec tsx scripts/import-original-product-galleries-cloudinary.ts --root /path/to/extracted --apply
 *
 * SAFETY: No Cloudinary or git deletion. No partial product DB updates.
 * This importer stores ORIGINAL files (no width, format, or quality transform).
 * Transform delivery at the URL (f_auto / q_auto:best) instead.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { v2 as cloudinary } from "cloudinary";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "../server/db.js";
import { products } from "../shared/schema.js";

type OriginalFile = {
  path: string;
  sha256: string;
  width: number;
  height: number;
  bytes: number;
};
type Gallery = { slug: string; files: OriginalFile[] };
type Manifest = { schemaVersion: number; products: Gallery[] };
type Row = {
  id: string;
  slug: string;
  thumbnail: string;
  images: string[];
};

const VALID_SLUGS = new Set([
  "yll-053-054", "yee-3602", "yee-10080", "yeb-751",
  "ysq-730", "c6-1017", "ykl-086",
]);
const EXPECTED_CLOUD = "dyczh8ogv";

function flag(name: string): boolean { return process.argv.includes(name); }
function argument(name: string): string | undefined {
  const pos = process.argv.indexOf(name);
  return pos >= 0 ? process.argv[pos + 1] : undefined;
}

async function main(): Promise<void> {
  const root = path.resolve(argument("--root") || ".");
  const apply = flag("--apply");
  const manifestPath = path.join(root, "manifest.json");
  if (!fs.existsSync(manifestPath)) throw new Error("manifest.json not found at --root");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as Manifest;
  if (manifest.schemaVersion !== 1 || manifest.products.length !== 7) {
    throw new Error("Expected the validated seven-gallery source package");
  }

  // Verify every original BEFORE opening Cloudinary or writing any DB fields.
  const seenSlugs = new Set<string>();
  let verifiedFiles = 0;
  for (const gallery of manifest.products) {
    if (!VALID_SLUGS.has(gallery.slug) || seenSlugs.has(gallery.slug)) {
      throw new Error("Unknown/duplicate gallery slug: " + gallery.slug);
    }
    seenSlugs.add(gallery.slug);
    if (gallery.files.length !== (gallery.slug === "yee-10080" ? 5 : 6)) {
      throw new Error("Unexpected gallery size: " + gallery.slug);
    }
    for (const f of gallery.files) {
      const expectedPrefix = "originals/" + gallery.slug + "/";
      if (!f.path.startsWith(expectedPrefix) || f.path.includes("..")) {
        throw new Error("Unsafe image path " + f.path);
      }
      const abs = path.resolve(root, f.path);
      if (!abs.startsWith(root + path.sep)) throw new Error("Image escaped source root");
      const bytes = fs.readFileSync(abs);
      const sha256 = createHash("sha256").update(bytes).digest("hex");
      const dimensions = await sharp(bytes).metadata();
      if (sha256 !== f.sha256 || bytes.length !== f.bytes
        || dimensions.width !== f.width || dimensions.height !== f.height
        || !["png", "jpeg", "webp"].includes(dimensions.format || "")) {
        throw new Error("Original source integrity failure: " + f.path);
      }
      verifiedFiles++;
    }
  }
  if (verifiedFiles !== 41) throw new Error("Expected 41 verified original photos");
  console.log("Verified original source images:", verifiedFiles);
  if (!apply) {
    for (const g of manifest.products) console.log("DRY RUN", g.slug, g.files.length, "original images");
    console.log("Dry-run complete: zero uploads, DB updates or deletions.");
    return;
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (cloudName !== EXPECTED_CLOUD || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error("Cloudinary upload credentials for existing AQUAVO cloud dyczh8ogv are required");
  }
  cloudinary.config({
    cloud_name: cloudName,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  const db = getDb();
  if (!db) throw new Error("DATABASE_URL is required");

  const slugs = [...VALID_SLUGS];
  const rows = await db.select({
    id: products.id, slug: products.slug,
    thumbnail: products.thumbnail, images: products.images,
  }).from(products).where(and(inArray(products.slug, slugs), isNull(products.deletedAt)));
  if (rows.length !== 7) throw new Error("Product DB mismatch: expected seven active slugs");

  // Snapshot CURRENT database pointers before uploads or writes.
  const backup = path.resolve(process.cwd(),
    "cloudinary-gallery-rollback-" + new Date().toISOString().replace(/[:.]/g, "-") + ".json");
  fs.writeFileSync(backup, JSON.stringify({
    createdAt: new Date().toISOString(), project: "AQUAVO", rows,
  }, null, 2), { flag: "wx" });
  console.log("Rollback snapshot:", backup);

  let changed = 0;
  const report: Array<{ slug: string; count: number; status: string; reason?: string }> = [];
  for (const gallery of manifest.products) {
    const row = rows.find(r => r.slug === gallery.slug) as Row;
    const urls: string[] = [];
    try {
      for (let i = 0; i < gallery.files.length; i++) {
        const f = gallery.files[i];
        const publicId = `aquavo/products/yee/${gallery.slug}/source-${String(i + 1).padStart(2, "0")}-${f.sha256.slice(0, 20)}`;
        let asset: any;
        try {
          asset = await cloudinary.api.resource(publicId, { resource_type: "image" });
        } catch (error: any) {
          if (error?.http_code !== 404 && error?.error?.http_code !== 404) throw error;
          asset = await cloudinary.uploader.upload(path.resolve(root, f.path), {
            public_id: publicId,
            resource_type: "image",
            overwrite: false,
            unique_filename: false,
            // NO incoming transformation: master stays at full original quality.
          });
        }
        if (asset.width !== f.width || asset.height !== f.height) {
          throw new Error("Cloudinary dimensions differ from original: " + f.path);
        }
        const url = asset.secure_url as string;
        if (!url?.startsWith(`https://res.cloudinary.com/${EXPECTED_CLOUD}/image/upload/`)) {
          throw new Error("Wrong Cloudinary asset origin");
        }
        // The original delivery URL must be reachable before DB cutover.
        const response = await fetch(url, { method: "HEAD" });
        if (!response.ok || !(response.headers.get("content-type") || "").startsWith("image/")) {
          throw new Error("Cloudinary original not publicly served: " + response.status);
        }
        urls.push(url);
      }
      const updated = await db.update(products)
        .set({ thumbnail: urls[0], images: urls })
        .where(and(
          eq(products.id, row.id),
          eq(products.thumbnail, row.thumbnail),
          eq(products.images, row.images),
        ))
        .returning({ id: products.id });
      if (updated.length !== 1) throw new Error("Product changed concurrently; retry after checking");
      changed++;
      report.push({ slug: gallery.slug, count: urls.length, status: "updated" });
      console.log("Updated:", gallery.slug, urls.length);
    } catch (error) {
      report.push({ slug: gallery.slug, count: urls.length, status: "FAILED",
        reason: error instanceof Error ? error.message : String(error) });
      console.error("SKIPPED product (original DB pointers retained):", gallery.slug, error);
    }
  }
  const reportPath = path.resolve(process.cwd(),
    "cloudinary-gallery-report-" + Date.now() + ".json");
  fs.writeFileSync(reportPath, JSON.stringify({ changed, report, backup }, null, 2), { flag: "wx" });
  console.log("Report:", reportPath, "Products migrated:", changed, "/ 7");
  if (changed !== 7) process.exitCode = 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
