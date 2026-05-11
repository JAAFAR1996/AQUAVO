/**
 * Image Optimization Script for AQUAVO
 * 
 * What it does:
 * 1. Finds all PNG files in client/public/images/products/
 * 2. Converts each to WebP (quality 80, max 1200px wide)
 * 3. Creates a smaller .card.webp variant (400px wide) for product cards
 * 4. Keeps original PNGs as backup (optional deletion after verification)
 * 
 * Based on: web.dev LCP optimization, Amazon image best practices
 * - WebP = 25-35% smaller than JPEG, 80-90% smaller than PNG
 * - 1200px max = covers all screen sizes without waste
 * - 400px card variant = fast product grid loading
 */

import sharp from "sharp";
import { readdir, stat, mkdir } from "fs/promises";
import { join, extname, basename, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = join(__dirname, "..", "client", "public", "images", "products");

const WEBP_QUALITY = 80;        // Good balance: quality vs size
const MAX_WIDTH = 1200;         // Max width for detail view
const CARD_WIDTH = 400;         // Product card thumbnails
const CARD_QUALITY = 75;        // Slightly lower for cards

let totalOriginalSize = 0;
let totalNewSize = 0;
let converted = 0;
let skipped = 0;
let errors = 0;

async function getAllFiles(dir, exts) {
  const results = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...await getAllFiles(fullPath, exts));
      } else if (exts.includes(extname(entry.name).toLowerCase())) {
        results.push(fullPath);
      }
    }
  } catch (e) {
    // skip inaccessible dirs
  }
  return results;
}

async function fileExists(path) {
  try { await stat(path); return true; } catch { return false; }
}

async function convertImage(pngPath) {
  const dir = dirname(pngPath);
  const name = basename(pngPath, extname(pngPath));
  const webpPath = join(dir, `${name}.webp`);
  const cardWebpPath = join(dir, `${name}.card.webp`);

  // Get original file size
  const originalStat = await stat(pngPath);
  totalOriginalSize += originalStat.size;

  // Check if WebP already exists
  const webpExists = await fileExists(webpPath);
  
  try {
    // 1. Full-size WebP (max 1200px wide)
    if (!webpExists) {
      const img = sharp(pngPath);
      const metadata = await img.metadata();
      
      let pipeline = sharp(pngPath);
      if (metadata.width > MAX_WIDTH) {
        pipeline = pipeline.resize(MAX_WIDTH, null, { 
          withoutEnlargement: true,
          fit: "inside"
        });
      }
      
      await pipeline
        .webp({ quality: WEBP_QUALITY, effort: 4 })
        .toFile(webpPath);
    }
    
    const webpStat = await stat(webpPath);
    totalNewSize += webpStat.size;

    // 2. Card variant (400px wide) - always create if missing
    const cardExists = await fileExists(cardWebpPath);
    if (!cardExists) {
      await sharp(pngPath)
        .resize(CARD_WIDTH, CARD_WIDTH, { 
          fit: "inside",
          withoutEnlargement: true 
        })
        .webp({ quality: CARD_QUALITY, effort: 4 })
        .toFile(cardWebpPath);
    }

    if (!webpExists) {
      const savings = ((1 - webpStat.size / originalStat.size) * 100).toFixed(0);
      console.log(`✓ ${basename(pngPath)} → WebP (${formatSize(originalStat.size)} → ${formatSize(webpStat.size)}, -${savings}%)`);
      converted++;
    } else {
      skipped++;
    }
  } catch (e) {
    console.error(`✗ ${basename(pngPath)}: ${e.message}`);
    errors++;
  }
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

async function main() {
  console.log("=== AQUAVO Image Optimizer ===\n");
  console.log(`Scanning: ${IMAGES_DIR}\n`);

  // Find all PNG and JPG files
  const pngFiles = await getAllFiles(IMAGES_DIR, [".png", ".jpg", ".jpeg"]);
  console.log(`Found ${pngFiles.length} images to process\n`);

  // Process in batches of 5 (parallel but not too many)
  const BATCH_SIZE = 5;
  for (let i = 0; i < pngFiles.length; i += BATCH_SIZE) {
    const batch = pngFiles.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(convertImage));
  }

  console.log("\n=== RESULTS ===");
  console.log(`Converted: ${converted}`);
  console.log(`Skipped (WebP exists): ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`Original total: ${formatSize(totalOriginalSize)}`);
  console.log(`New WebP total: ${formatSize(totalNewSize)}`);
  console.log(`Savings: ${formatSize(totalOriginalSize - totalNewSize)} (${((1 - totalNewSize / totalOriginalSize) * 100).toFixed(0)}%)`);
}

main().catch(console.error);
