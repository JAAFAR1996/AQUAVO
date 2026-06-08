/**
 * migrate-product-images-to-cloudinary.ts
 *
 * Migrates local product images to Cloudinary.
 * Supports single product, all products, batching, limits, and safe dry-run.
 *
 * ─── USAGE ───────────────────────────────────────────────────────────────────
 *
 * # Dry-run single product (no uploads, no DB writes):
 *   npx tsx scripts/migrate-product-images-to-cloudinary.ts --slug ytz-300
 *
 * # Apply single product:
 *   npx tsx scripts/migrate-product-images-to-cloudinary.ts --slug ytz-300 --apply
 *
 * # Dry-run ALL products (no uploads, no DB writes):
 *   npx tsx scripts/migrate-product-images-to-cloudinary.ts --all
 *
 * # Dry-run first 5 products only:
 *   npx tsx scripts/migrate-product-images-to-cloudinary.ts --all --limit 5
 *
 * # Apply all products in batches of 10 (uploads + DB):
 *   npx tsx scripts/migrate-product-images-to-cloudinary.ts --all --apply --batch-size 10
 *
 * ─── SAFETY RULES ────────────────────────────────────────────────────────────
 *  • Default mode is always dry-run.
 *  • --apply is required for any upload or DB write.
 *  • --all --apply without --batch-size is refused when product count > 20.
 *  • A product with ANY missing local image is skipped (no partial DB update).
 *  • A product is only updated in DB if ALL required uploads succeeded.
 *  • DB update touches ONLY images[] and thumbnail — nothing else.
 *
 * ─── REQUIRED ENV VARS ───────────────────────────────────────────────────────
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

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_SLUG = "ytz-300";
const LARGE_BATCH_THRESHOLD = 20;

/** Root of the public static directory */
export const PUBLIC_DIR = path.resolve("client/public");

// ─── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

function getArg(name: string): string | undefined {
  const idx = args.indexOf(name);
  return idx !== -1 ? args[idx + 1] : undefined;
}

function hasFlag(name: string): boolean {
  return args.includes(name);
}

const cliSlug = getArg("--slug");
const cliAll = hasFlag("--all");
const apply = hasFlag("--apply");
const batchSizeRaw = getArg("--batch-size");
const limitRaw = getArg("--limit");
const batchSize = batchSizeRaw ? parseInt(batchSizeRaw, 10) : 5;
const limit = limitRaw ? parseInt(limitRaw, 10) : Infinity;

// ─── Cloudinary setup ────────────────────────────────────────────────────────

export function assertCloudinaryEnv(): void {
  const missing: string[] = [];
  if (!process.env.CLOUDINARY_CLOUD_NAME) missing.push("CLOUDINARY_CLOUD_NAME");
  if (!process.env.CLOUDINARY_API_KEY) missing.push("CLOUDINARY_API_KEY");
  if (!process.env.CLOUDINARY_API_SECRET) missing.push("CLOUDINARY_API_SECRET");
  if (missing.length > 0) {
    throw new Error(
      `Missing Cloudinary env vars: ${missing.join(", ")}\nSee .env.example for values.`
    );
  }
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// ─── Pure helpers (exported for unit tests) ──────────────────────────────────

/**
 * Returns true only for root-relative local paths like /images/products/...
 * Returns false for https://, //, data:, or empty strings.
 */
export function isRelativePath(url: string): boolean {
  if (!url) return false;
  return url.startsWith("/") && !url.startsWith("//");
}

/**
 * Derives a Cloudinary public_id from a local relative path.
 *
 * /images/products/yee/yee-ytz-300/model.webp
 *   → aquavo/products/yee/yee-ytz-300/model
 */
export function toPublicId(localPath: string): string {
  const rel = localPath
    .replace(/^\/+/, "")         // strip leading /
    .replace(/^images\//, "");   // strip images/ prefix
  const withoutExt = rel.replace(/\.[^.]+$/, "");
  return `aquavo/${withoutExt}`;
}

/**
 * Builds the Cloudinary folder path for a product.
 * Uses the brand field (lowercased, slug-safe) or "unknown" as fallback.
 *
 * brand="YEE", slug="yee-ytz-300" → "aquavo/products/yee/yee-ytz-300"
 */
export function buildProductFolder(brand: string, slug: string): string {
  const safeBrand = brand
    ? brand.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
    : "unknown";
  return `aquavo/products/${safeBrand}/${slug}`;
}

export function localPathToAbs(relativePath: string): string {
  return path.join(PUBLIC_DIR, relativePath);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ImagePlan {
  oldPath: string;
  localAbs: string;
  fileExists: boolean;
  publicId: string;
  alreadyOnCloudinary: boolean;
  proposedUrl: string | null;
  uploadedUrl?: string;
  error?: string;
  skipped?: boolean; // already absolute URL
}

export interface ProductMigrationResult {
  productId: string;
  productName: string;
  slug: string;
  status: "migrated" | "skipped" | "failed" | "already_done" | "no_images";
  imagesUploaded: number;
  imagesReused: number;
  imagesMissing: number;
  uploadsFailed: number;
  dbUpdated: boolean;
  plan: ImagePlan[];
}

export interface MigrationReport {
  mode: "dry-run" | "apply";
  productsScanned: number;
  productsSkipped: number;       // no relative images, nothing to do
  productsMigrated: number;      // DB updated
  productsFailed: number;        // had missing files or upload failures
  imagesUploaded: number;
  imagesAlreadyCloudinary: number;
  imagesMissingLocally: number;
  imagesUploadFailed: number;
  dbRowsUpdated: number;
}

// ─── Cloudinary API ──────────────────────────────────────────────────────────

/**
 * Checks whether a Cloudinary asset already exists (no upload).
 * Returns secure_url if found, null otherwise.
 */
export async function getExistingCloudinaryUrl(publicId: string): Promise<string | null> {
  try {
    const result = await cloudinary.api.resource(publicId, { resource_type: "image" });
    return (result as { secure_url?: string }).secure_url ?? null;
  } catch {
    return null;
  }
}

/**
 * Uploads a local file to Cloudinary.
 * Preserves WebP format. Uses high-quality storage.
 * Does NOT overwrite if public_id already exists.
 */
export async function uploadToCloudinary(
  localFilePath: string,
  publicId: string
): Promise<string> {
  const ext = path.extname(localFilePath).toLowerCase().slice(1);
  const result = await cloudinary.uploader.upload(localFilePath, {
    public_id: publicId,
    resource_type: "image",
    overwrite: false,
    format: ext === "webp" ? "webp" : undefined,
    quality: "auto:best",
  });
  return result.secure_url;
}

// ─── Plan builder ─────────────────────────────────────────────────────────────

/**
 * Builds the migration plan for a product's images array.
 * Checks local file existence and Cloudinary presence for each relative URL.
 * Absolute URLs are silently skipped (already migrated or external).
 */
export async function buildPlan(
  imageUrls: string[],
  checkCloudinary: boolean = true
): Promise<ImagePlan[]> {
  const plan: ImagePlan[] = [];

  for (const url of imageUrls) {
    if (!isRelativePath(url)) {
      plan.push({
        oldPath: url,
        localAbs: "",
        fileExists: false,
        publicId: "",
        alreadyOnCloudinary: true, // already absolute — treat as done
        proposedUrl: url,
        skipped: true,
      });
      continue;
    }

    const localAbs = localPathToAbs(url);
    const fileExists = fs.existsSync(localAbs);
    const publicId = toPublicId(url);

    let alreadyOnCloudinary = false;
    let proposedUrl: string | null = null;

    if (fileExists && checkCloudinary) {
      const existing = await getExistingCloudinaryUrl(publicId);
      if (existing) {
        alreadyOnCloudinary = true;
        proposedUrl = existing;
      } else {
        const ext = url.endsWith(".webp") ? "webp" : "jpg";
        proposedUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME ?? "CLOUD"}/image/upload/${publicId}.${ext}`;
      }
    }

    plan.push({ oldPath: url, localAbs, fileExists, publicId, alreadyOnCloudinary, proposedUrl });
  }

  return plan;
}

// ─── Per-product migration ────────────────────────────────────────────────────

/**
 * Executes the migration for a single product.
 * Returns a result object — does NOT throw on partial failure.
 *
 * Safety guarantees:
 *  • If any required local file is missing → skips entire product, no DB write.
 *  • If any upload fails → skips entire product, no DB write.
 *  • DB is updated only when ALL required uploads succeeded.
 *  • Preserves image order.
 */
export async function migrateProduct(
  productId: string,
  productName: string,
  productSlug: string,
  originalImages: string[],
  applyMode: boolean
): Promise<ProductMigrationResult> {
  // Guard: empty images array — nothing to do
  if (originalImages.length === 0) {
    return {
      productId,
      productName,
      slug: productSlug,
      status: "no_images",
      imagesUploaded: 0,
      imagesReused: 0,
      imagesMissing: 0,
      uploadsFailed: 0,
      dbUpdated: false,
      plan: [],
    };
  }

  const plan = await buildPlan(originalImages);

  const required = plan.filter((p) => !p.skipped);
  const hasMissing = required.some((p) => !p.fileExists);

  if (hasMissing) {
    const missingPaths = required.filter((p) => !p.fileExists).map((p) => p.oldPath);
    console.log(`  ⚠️  Skipping ${productName} — missing local files: ${missingPaths.join(", ")}`);
    return {
      productId,
      productName,
      slug: productSlug,
      status: "failed",
      imagesUploaded: 0,
      imagesReused: 0,
      imagesMissing: missingPaths.length,
      uploadsFailed: 0,
      dbUpdated: false,
      plan,
    };
  }

  // All local files present — check if already all on Cloudinary
  const toUpload = required.filter((p) => !p.alreadyOnCloudinary);
  const alreadyDone = required.filter((p) => p.alreadyOnCloudinary);

  if (toUpload.length === 0 && required.length > 0) {
    console.log(`  ☁️  ${productName} — all images already on Cloudinary, skipping.`);
    return {
      productId,
      productName,
      slug: productSlug,
      status: "already_done",
      imagesUploaded: 0,
      imagesReused: alreadyDone.length,
      imagesMissing: 0,
      uploadsFailed: 0,
      dbUpdated: false,
      plan,
    };
  }

  if (!applyMode) {
    // Dry-run: just return the plan without uploading
    return {
      productId,
      productName,
      slug: productSlug,
      status: "skipped",
      imagesUploaded: 0,
      imagesReused: alreadyDone.length,
      imagesMissing: 0,
      uploadsFailed: 0,
      dbUpdated: false,
      plan,
    };
  }

  // APPLY: upload each file that needs it
  let uploadFailed = false;

  for (const item of plan) {
    if (item.skipped || item.alreadyOnCloudinary) {
      item.uploadedUrl = item.proposedUrl ?? item.oldPath;
      continue;
    }

    if (!item.fileExists) continue; // guarded above, shouldn't reach here

    try {
      console.log(`    📤 Uploading: ${item.oldPath}`);
      const url = await uploadToCloudinary(item.localAbs, item.publicId);
      item.uploadedUrl = url;
      console.log(`       ✅ ${url}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`    ❌ Upload failed: ${item.oldPath} — ${message}`);
      item.error = message;
      uploadFailed = true;
    }
  }

  if (uploadFailed) {
    console.log(`  ❌ ${productName} — upload failure, skipping DB update.`);
    const failedItems = plan.filter((p) => p.error);
    return {
      productId,
      productName,
      slug: productSlug,
      status: "failed",
      imagesUploaded: plan.filter((p) => p.uploadedUrl && !p.alreadyOnCloudinary).length,
      imagesReused: alreadyDone.length,
      imagesMissing: 0,
      uploadsFailed: failedItems.length,
      dbUpdated: false,
      plan,
    };
  }

  // Build the new images array — preserving order
  const newImages: string[] = originalImages.map((url) => {
    const item = plan.find((p) => p.oldPath === url);
    return item?.uploadedUrl ?? url;
  });

  // Thumbnail = first item in newImages (preserves first-image-stays-first rule)
  const newThumbnail = newImages[0] ?? "";

  // DB update: images[] + thumbnail only
  await db
    .update(products)
    .set({ images: newImages, thumbnail: newThumbnail })
    .where(eq(products.id, productId));

  const uploaded = plan.filter((p) => p.uploadedUrl && !p.alreadyOnCloudinary && !p.skipped);

  console.log(`  ✅ ${productName} — migrated (${uploaded.length} uploaded, ${alreadyDone.length} reused)`);

  return {
    productId,
    productName,
    slug: productSlug,
    status: "migrated",
    imagesUploaded: uploaded.length,
    imagesReused: alreadyDone.length,
    imagesMissing: 0,
    uploadsFailed: 0,
    dbUpdated: true,
    plan,
  };
}

// ─── Report printer ───────────────────────────────────────────────────────────

export function printProductDryRun(
  productName: string,
  slug: string,
  plan: ImagePlan[]
): void {
  const relative = plan.filter((p) => !p.skipped);
  if (relative.length === 0) {
    console.log(`  ✅ ${productName} — all absolute URLs, nothing to migrate.`);
    return;
  }

  console.log(`\n  📦 ${productName}  [${slug}]`);
  for (const item of relative) {
    const tag = !item.fileExists
      ? "❌ MISSING "
      : item.alreadyOnCloudinary
      ? "☁  EXISTS  "
      : "📤 UPLOAD  ";
    console.log(`    ${tag} ${item.oldPath}`);
    if (item.proposedUrl && !item.alreadyOnCloudinary && item.fileExists) {
      console.log(`           → ${item.proposedUrl}`);
    }
  }
  const missing = relative.filter((p) => !p.fileExists).length;
  const toUpload = relative.filter((p) => p.fileExists && !p.alreadyOnCloudinary).length;
  const reused = relative.filter((p) => p.alreadyOnCloudinary).length;
  if (missing > 0) console.log(`    ⚠️  ${missing} file(s) missing locally — product will be SKIPPED on apply`);
  console.log(`    → ${toUpload} to upload, ${reused} already on Cloudinary`);
}

export function printFinalReport(report: MigrationReport): void {
  const line = "═".repeat(62);
  console.log(`\n${line}`);
  console.log(`  MIGRATION REPORT  [${report.mode.toUpperCase()}]`);
  console.log(line);
  console.log(`  Products scanned         : ${report.productsScanned}`);
  console.log(`  Products skipped         : ${report.productsSkipped}`);
  console.log(`  Products migrated        : ${report.productsMigrated}`);
  console.log(`  Products failed/blocked  : ${report.productsFailed}`);
  console.log(`  ──────────────────────────────────────────────────`);
  console.log(`  Images uploaded          : ${report.imagesUploaded}`);
  console.log(`  Images already Cloudinary: ${report.imagesAlreadyCloudinary}`);
  console.log(`  Images missing locally   : ${report.imagesMissingLocally}`);
  console.log(`  Upload failures          : ${report.imagesUploadFailed}`);
  console.log(`  ──────────────────────────────────────────────────`);
  console.log(`  DB rows updated          : ${report.dbRowsUpdated}`);
  console.log(line);
  if (report.mode === "dry-run") {
    console.log(`\n  ➡  Dry-run complete. No uploads or DB writes were made.`);
    console.log(`     Review the report above, then run with --apply to proceed.`);
  }
  console.log();
}

// ─── Chunk helper ─────────────────────────────────────────────────────────────

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const mode = apply ? "APPLY" : "DRY RUN";
  const scope = cliAll ? "ALL products" : `slug="${cliSlug ?? DEFAULT_SLUG}"`;

  console.log(`\n🔍 Cloudinary Product Image Migration`);
  console.log(`   Scope : ${scope}`);
  console.log(`   Mode  : ${mode}${apply ? " (uploads + DB update)" : " (read-only)"}`);
  if (cliAll && batchSizeRaw) console.log(`   Batch : ${batchSize}`);
  if (limit !== Infinity) console.log(`   Limit : ${limit}`);
  console.log();

  assertCloudinaryEnv();

  // ── Fetch products ──────────────────────────────────────────────────────────
  let productList: Array<{
    id: string;
    name: string;
    slug: string;
    brand: string;
    images: string[] | null;
    thumbnail: string;
  }>;

  if (cliAll) {
    const rows = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        brand: products.brand,
        images: products.images,
        thumbnail: products.thumbnail,
      })
      .from(products)
      .orderBy(products.createdAt);

    productList = rows.slice(0, limit === Infinity ? rows.length : limit) as typeof productList;
  } else {
    const slug = cliSlug ?? DEFAULT_SLUG;
    const rows = await db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        brand: products.brand,
        images: products.images,
        thumbnail: products.thumbnail,
      })
      .from(products)
      .where(eq(products.slug, slug))
      .limit(1);

    if (rows.length === 0) {
      console.error(`❌ Product not found: slug="${slug}"`);
      process.exit(1);
    }
    productList = rows as typeof productList;
  }

  console.log(`  Found ${productList.length} product(s) to process.\n`);

  // ── Safety gate for large apply ─────────────────────────────────────────────
  if (apply && productList.length > LARGE_BATCH_THRESHOLD && !batchSizeRaw) {
    console.error(
      `❌ Safety gate: you are about to apply ${productList.length} products without --batch-size.\n` +
      `   This could overwhelm Cloudinary API rate limits.\n` +
      `   Add: --batch-size 10\n` +
      `   Example: npx tsx scripts/migrate-product-images-to-cloudinary.ts --all --apply --batch-size 10`
    );
    process.exit(1);
  }

  // ── Dry-run for all ─────────────────────────────────────────────────────────
  if (!apply) {
    const sep = "─".repeat(62);
    console.log(sep);
    console.log("  DRY RUN — product image plan:");
    console.log(sep);

    const report: MigrationReport = {
      mode: "dry-run",
      productsScanned: productList.length,
      productsSkipped: 0,
      productsMigrated: 0,
      productsFailed: 0,
      imagesUploaded: 0,
      imagesAlreadyCloudinary: 0,
      imagesMissingLocally: 0,
      imagesUploadFailed: 0,
      dbRowsUpdated: 0,
    };

    for (const product of productList) {
      const imageUrls = Array.isArray(product.images) ? product.images : [];
      if (imageUrls.length === 0) {
        console.log(`  ⚠️  ${product.name} — no images, skipping.`);
        report.productsSkipped++;
        continue;
      }
      const plan = await buildPlan(imageUrls);
      printProductDryRun(product.name, product.slug, plan);

      const relative = plan.filter((p) => !p.skipped);
      const missing = relative.filter((p) => !p.fileExists);
      const reused = relative.filter((p) => p.alreadyOnCloudinary);
      const toUpload = relative.filter((p) => p.fileExists && !p.alreadyOnCloudinary);

      report.imagesMissingLocally += missing.length;
      report.imagesAlreadyCloudinary += reused.length;

      if (missing.length > 0) {
        report.productsFailed++;
      } else if (toUpload.length === 0) {
        report.productsSkipped++;
      } else {
        report.productsSkipped++; // would be migrated in apply
      }
    }

    printFinalReport(report);
    process.exit(0);
  }

  // ── Apply ───────────────────────────────────────────────────────────────────
  const report: MigrationReport = {
    mode: "apply",
    productsScanned: productList.length,
    productsSkipped: 0,
    productsMigrated: 0,
    productsFailed: 0,
    imagesUploaded: 0,
    imagesAlreadyCloudinary: 0,
    imagesMissingLocally: 0,
    imagesUploadFailed: 0,
    dbRowsUpdated: 0,
  };

  const batches = chunkArray(productList, batchSize);
  console.log(`  Processing in ${batches.length} batch(es) of up to ${batchSize}.\n`);

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];
    console.log(`\n  ── Batch ${batchIdx + 1}/${batches.length} (${batch.length} products) ──`);

    for (const product of batch) {
      const imageUrls = Array.isArray(product.images) ? product.images : [];
      if (imageUrls.length === 0) {
        console.log(`  ⏭  ${product.name} — no images, skipping.`);
        report.productsSkipped++;
        continue;
      }

      console.log(`\n  📦 ${product.name}  [${product.slug}]`);
      const result = await migrateProduct(
        product.id,
        product.name,
        product.slug,
        imageUrls,
        true
      );

      report.imagesUploaded += result.imagesUploaded;
      report.imagesAlreadyCloudinary += result.imagesReused;
      report.imagesMissingLocally += result.imagesMissing;
      report.imagesUploadFailed += result.uploadsFailed;

      switch (result.status) {
        case "migrated":
          report.productsMigrated++;
          report.dbRowsUpdated++;
          break;
        case "already_done":
          report.productsSkipped++;
          break;
        case "skipped":
          report.productsSkipped++;
          break;
        case "no_images":
          report.productsSkipped++;
          break;
        case "failed":
          report.productsFailed++;
          break;
      }
    }
  }

  printFinalReport(report);
  process.exit(0);
}

// Only run when invoked directly (not during vitest/jest import)
const isDirectRun =
  typeof process !== "undefined" &&
  process.argv[1] &&
  process.argv[1].includes("migrate-product-images-to-cloudinary");

if (isDirectRun) {
  main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}
