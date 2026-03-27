/**
 * Fix houyi product image paths in the database.
 * The DB stores old paths like /images/products/houyi/Old Name/file.jpg
 * but files have been moved to /images/products/houyi/houyi-slug/file.jpg
 */
import { db } from "../server/db";
import { products } from "../server/schema";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

const PUBLIC_DIR = path.resolve("client/public");
const HOUYI_DIR = path.join(PUBLIC_DIR, "images/products/houyi");

// Build index: filename -> [relative URL paths]
function buildFileIndex(): Record<string, string[]> {
  const index: Record<string, string[]> = {};

  function walk(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        walk(full);
      } else {
        const rel = "/" + path.relative(PUBLIC_DIR, full).split(path.sep).join("/");
        if (!index[e.name]) index[e.name] = [];
        index[e.name].push(rel);
      }
    }
  }

  walk(HOUYI_DIR);
  return index;
}

function fixImagePath(imgPath: string, slug: string, index: Record<string, string[]>): string | null {
  if (!imgPath.startsWith("/images/")) return null;

  // Check if file already exists at given path
  const fullPath = path.join(PUBLIC_DIR, imgPath.slice(1).split("/").join(path.sep));
  if (fs.existsSync(fullPath)) return imgPath; // already correct

  const fname = path.basename(imgPath);
  const matches = index[fname] || [];
  if (matches.length === 0) return null; // truly missing

  // Prefer the folder that matches the slug
  return matches.find(m => m.includes("/" + slug + "/")) || matches[0];
}

async function main() {
  console.log("Building file index...");
  const index = buildFileIndex();
  console.log(`Indexed ${Object.keys(index).length} unique filenames`);

  // Fetch all houyi products
  const allProducts = await db.select().from(products);
  const hoyuiProducts = allProducts.filter(p => p.slug?.includes("houyi"));

  console.log(`Found ${hoyuiProducts.length} houyi products in DB`);

  let updatedCount = 0;
  let unfixableCount = 0;

  for (const product of hoyuiProducts) {
    const slug = product.slug!;
    let changed = false;

    // Fix thumbnail
    let thumb = product.thumbnail || "";
    if (thumb.startsWith("/images/")) {
      const fixed = fixImagePath(thumb, slug, index);
      if (fixed === null) {
        console.warn(`UNFIXABLE thumbnail for ${slug}: ${thumb}`);
        unfixableCount++;
      } else if (fixed !== thumb) {
        console.log(`  THUMB ${slug}: ${thumb} -> ${fixed}`);
        thumb = fixed;
        changed = true;
      }
    }

    // Fix images array
    const images: string[] = product.images as string[] || [];
    const fixedImages: string[] = [];
    for (const img of images) {
      if (img.startsWith("/images/")) {
        const fixed = fixImagePath(img, slug, index);
        if (fixed === null) {
          console.warn(`UNFIXABLE image for ${slug}: ${img}`);
          unfixableCount++;
          fixedImages.push(img); // keep original
        } else {
          if (fixed !== img) {
            console.log(`  IMG  ${slug}: ${img} -> ${fixed}`);
            changed = true;
          }
          fixedImages.push(fixed);
        }
      } else {
        fixedImages.push(img); // cloudinary or external, keep as-is
      }
    }

    if (changed) {
      await db
        .update(products)
        .set({ thumbnail: thumb, images: fixedImages })
        .where(eq(products.slug, slug));
      updatedCount++;
    }
  }

  console.log(`\n=== DONE ===`);
  console.log(`Updated: ${updatedCount} products`);
  console.log(`Unfixable images: ${unfixableCount}`);
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
