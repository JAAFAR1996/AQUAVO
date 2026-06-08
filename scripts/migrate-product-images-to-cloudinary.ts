/**
 * migrate-product-images-to-cloudinary.ts
 *
 * Migrates local product images to Cloudinary for a single product.
 *
 * Usage:
 *   # Dry-run (no DB writes, no uploads):
 *   npx tsx scripts/migrate-product-images-to-cloudinary.ts
 *   npx tsx scripts/migrate-product-images-to-cloudinary.ts --slug ytz-300
 *
 *   # Apply (uploads to Cloudinary + updates DB):
 *   npx tsx scripts/migrate-product-images-to-cloudinary.ts --slug ytz-300 --apply
 *
 * Required env vars (from .env or .env.local):
 *   CLOUDINARY_CLOUD_NAME
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 *   DATABASE_URL
 */

import "dotenv/config";
import path from "path";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import { db } from "../server/db.js";
import { products } from "../shared/schema.js";
import { eq } from "drizzle-orm";

// ─── Config ────────────────────────────────────────────────────────────────

const DEFAULT_SLUG = "ytz-300";

/** Root of the public static directory containing /images/products/... */
const PUBLIC_DIR = path.resolve("client/public");

// ─── CLI args ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

function getArg(name: string): string | undefined {
  const idx = args.indexOf(name);
  return idx !== -1 ? args[idx + 1] : undefined;
}

const slug = getArg("--slug") ?? DEFAULT_SLUG;
const apply = args.includes("--apply");

// ─── Cloudinary ─────────────────────────────────────────────────────────────

function assertCloudinaryEnv(): void {
  const missing: string[] = [];
  if (!process.env.CLOUDINARY_CLOUD_NAME) missing.push("CLOUDINARY_CLOUD_NAME");
  if (!process.env.CLOUDINARY_API_KEY) missing.push("CLOUDINARY_API_KEY");
  if (!process.env.CLOUDINARY_API_SECRET) missing.push("CLOUDINARY_API_SECRET");
  if (missing.length > 0) {
    throw new Error(
      `Missing Cloudinary env vars: ${missing.join(", ")}\n` +
      `See .env.example for the required values.`
    );
  }
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Derives a Cloudinary public_id from a local image path.
 * e.g. /images/products/yee/yee-ytz-300/model.webp
 *   -> aquavo/products/yee/yee-ytz-300/model
 */
function toPublicId(localPath: string): string {
  // Strip leading slash and "images/" prefix
  const rel = localPath.replace(/^\/+/, "").replace(/^images\//, "");
  // Remove file extension
  const withoutExt = rel.replace(/\.[^.]+$/, "");
  return `aquavo/${withoutExt}`;
}

/**
 * Checks whether a Cloudinary asset already exists without uploading.
 * Returns the existing secure_url if found, or null.
 */
async function getExistingCloudinaryUrl(publicId: string): Promise<string | null> {
  try {
    const result = await cloudinary.api.resource(publicId, { resource_type: "image" });
    return (result as { secure_url?: string }).secure_url ?? null;
  } catch {
    return null; // 404 = does not exist yet
  }
}

/**
 * Uploads a local file to Cloudinary, preserving WebP format.
 * Returns the secure_url.
 */
async function uploadToCloudinary(
  localFilePath: string,
  publicId: string
): Promise<string> {
  const result = await cloudinary.uploader.upload(localFilePath, {
    public_id: publicId,
    resource_type: "image",
    overwrite: false,      // do NOT overwrite if already exists
    // Preserve original format (WebP stays WebP).
    // f_auto/q_auto only used at display-time via Cloudinary delivery URLs,
    // not applied destructively to the stored original.
    format: localFilePath.endsWith(".webp") ? "webp" : undefined,
    quality: "auto:best",  // high quality — not lossy default
  });
  return result.secure_url;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isRelativePath(url: string): boolean {
  return url.startsWith("/") && !url.startsWith("//");
}

function localPathToAbs(relativePath: string): string {
  return path.join(PUBLIC_DIR, relativePath);
}

// ─── Main ────────────────────────────────────────────────────────────────────

interface ImagePlan {
  oldPath: string;
  localAbs: string;
  fileExists: boolean;
  publicId: string;
  alreadyOnCloudinary: boolean;
  proposedUrl: string | null; // null if file missing
  uploadedUrl?: string;       // set during apply
  error?: string;
}

async function buildPlan(imageUrls: string[]): Promise<ImagePlan[]> {
  const plan: ImagePlan[] = [];

  for (const url of imageUrls) {
    if (!isRelativePath(url)) {
      // Already an absolute URL (Cloudinary or other CDN) — skip
      console.log(`  ⏭  Skip (already absolute): ${url}`);
      continue;
    }

    const localAbs = localPathToAbs(url);
    const fileExists = fs.existsSync(localAbs);
    const publicId = toPublicId(url);

    let alreadyOnCloudinary = false;
    let proposedUrl: string | null = null;

    if (fileExists) {
      // Check if already uploaded
      const existing = await getExistingCloudinaryUrl(publicId);
      if (existing) {
        alreadyOnCloudinary = true;
        proposedUrl = existing;
      } else {
        // Build what the URL will look like after upload
        proposedUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${publicId}.${url.endsWith(".webp") ? "webp" : "jpg"}`;
      }
    }

    plan.push({ oldPath: url, localAbs, fileExists, publicId, alreadyOnCloudinary, proposedUrl });
  }

  return plan;
}

function printDryRunTable(productName: string, plan: ImagePlan[]): void {
  console.log(`\n${"─".repeat(80)}`);
  console.log(`DRY RUN — Product: ${productName} (slug: ${slug})`);
  console.log(`${"─".repeat(80)}\n`);

  if (plan.length === 0) {
    console.log("  ✅ All images are already absolute URLs — nothing to migrate.");
    return;
  }

  for (const item of plan) {
    const status = !item.fileExists
      ? "❌ FILE MISSING"
      : item.alreadyOnCloudinary
      ? "☁️  ALREADY ON CLOUDINARY"
      : "📤 WILL UPLOAD";

    console.log(`  ${status}`);
    console.log(`    Old path : ${item.oldPath}`);
    console.log(`    Local    : ${item.localAbs}`);
    console.log(`    PublicId : ${item.publicId}`);
    console.log(`    URL      : ${item.proposedUrl ?? "(skipped — file missing)"}`);
    console.log();
  }

  const willUpload = plan.filter((i) => i.fileExists && !i.alreadyOnCloudinary).length;
  const missing = plan.filter((i) => !i.fileExists).length;
  const existing = plan.filter((i) => i.alreadyOnCloudinary).length;

  console.log(`  Summary: ${willUpload} to upload, ${existing} already on Cloudinary, ${missing} missing locally`);
  console.log(`\n  ➡  Run with --apply to upload and update DB.`);
  console.log(`${"─".repeat(80)}\n`);
}

async function applyMigration(
  productId: string,
  productName: string,
  plan: ImagePlan[],
  originalImages: string[]
): Promise<void> {
  console.log(`\n${"─".repeat(80)}`);
  console.log(`APPLY — Product: ${productName} (slug: ${slug})`);
  console.log(`${"─".repeat(80)}\n`);

  // Start with original images array, replace relative paths with Cloudinary URLs
  const newImages: string[] = [...originalImages];

  for (const item of plan) {
    if (!item.fileExists) {
      console.log(`  ⚠️  Skipping (file missing): ${item.oldPath}`);
      item.error = "local file not found";
      continue;
    }

    if (item.alreadyOnCloudinary && item.proposedUrl) {
      console.log(`  ☁️  Already on Cloudinary: ${item.proposedUrl}`);
      item.uploadedUrl = item.proposedUrl;
    } else {
      try {
        console.log(`  📤 Uploading: ${item.oldPath}`);
        const url = await uploadToCloudinary(item.localAbs, item.publicId);
        item.uploadedUrl = url;
        console.log(`     ✅ ${url}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`  ❌ Upload failed: ${item.oldPath} — ${message}`);
        item.error = message;
        // Keep original path in images array on failure
        continue;
      }
    }

    // Replace the relative path with the Cloudinary URL
    const idx = newImages.indexOf(item.oldPath);
    if (idx !== -1 && item.uploadedUrl) {
      newImages[idx] = item.uploadedUrl;
    }
  }

  // Determine new thumbnail (first Cloudinary URL, or keep existing)
  const newThumbnail = newImages.find((u) => u.startsWith("https://")) ?? newImages[0];

  console.log(`\n  📝 Updating DB for product id: ${productId}`);
  console.log(`     images[]:  ${newImages.length} entries`);
  console.log(`     thumbnail: ${newThumbnail}`);

  // Update ONLY images and thumbnail — nothing else
  await db
    .update(products)
    .set({
      images: newImages,
      thumbnail: newThumbnail ?? "",
    })
    .where(eq(products.id, productId));

  const failed = plan.filter((i) => i.error);
  const uploaded = plan.filter((i) => i.uploadedUrl && !i.alreadyOnCloudinary);
  const reused = plan.filter((i) => i.alreadyOnCloudinary);

  console.log(`\n  Summary:`);
  console.log(`    ✅ Uploaded   : ${uploaded.length}`);
  console.log(`    ☁️  Reused     : ${reused.length}`);
  console.log(`    ❌ Failed     : ${failed.length}`);
  console.log(`    DB updated   : YES (images[], thumbnail only)`);
  if (failed.length > 0) {
    console.log(`\n  Failed files:`);
    failed.forEach((f) => console.log(`    - ${f.oldPath}: ${f.error}`));
  }
  console.log(`${"─".repeat(80)}\n`);
}

async function main(): Promise<void> {
  console.log(`\n🔍 Cloudinary Product Image Migration`);
  console.log(`   Slug  : ${slug}`);
  console.log(`   Mode  : ${apply ? "APPLY (uploads + DB update)" : "DRY RUN (read-only)"}\n`);

  // Validate Cloudinary credentials are present
  assertCloudinaryEnv();

  // Fetch product from DB
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.slug, slug))
    .limit(1);

  if (!product) {
    console.error(`❌ Product not found in DB: slug="${slug}"`);
    process.exit(1);
  }

  console.log(`  Found: ${product.name} (id: ${product.id})`);
  console.log(`  Images in DB: ${product.images?.length ?? 0}`);

  const imageUrls: string[] = Array.isArray(product.images) ? product.images : [];

  if (imageUrls.length === 0) {
    console.log("  ⚠️  Product has no images in DB. Nothing to migrate.");
    process.exit(0);
  }

  // Build migration plan
  const plan = await buildPlan(imageUrls);

  if (!apply) {
    printDryRunTable(product.name, plan);
    process.exit(0);
  }

  // Apply
  await applyMigration(product.id, product.name, plan, imageUrls);
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
