/**
 * Fix All Product Images Script
 * 
 * This script:
 * 1. Fetches all products from NEON database
 * 2. Scans local image folders (yee, HYGGER, Houyi)
 * 3. Matches product slugs to folder names
 * 4. Updates products with correct images or clears them if no match
 */

import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.production' });

const sql = neon(process.env.DATABASE_URL!);

// Base paths
const PROJECT_ROOT = 'C:/Users/jaafa/Desktop/upload/FishWebClean';
const PUBLIC_IMAGES = path.join(PROJECT_ROOT, 'client/public/images/products');

// Image folders to scan
const IMAGE_FOLDERS = {
    yee: path.join(PROJECT_ROOT, 'yee'),
    hygger: path.join(PROJECT_ROOT, 'HYGGER'),
    houyi: path.join(PROJECT_ROOT, 'Houyi'),
};

// Image extensions
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif'];

interface FolderMapping {
    folderName: string;
    folderPath: string;
    brand: string;
    images: string[];
}

interface ProductData {
    id: string;
    slug: string;
    name: string;
    brand: string;
    thumbnail: string;
    images: string[];
}

/**
 * Scan a directory for image files
 */
function getImagesFromFolder(folderPath: string): string[] {
    try {
        if (!fs.existsSync(folderPath)) return [];

        const files = fs.readdirSync(folderPath);
        return files.filter(file =>
            IMAGE_EXTENSIONS.includes(path.extname(file).toLowerCase())
        );
    } catch (err) {
        return [];
    }
}

/**
 * Build a mapping of all available image folders
 */
function buildFolderMapping(): Map<string, FolderMapping> {
    const mapping = new Map<string, FolderMapping>();

    // Scan YEE folders
    if (fs.existsSync(IMAGE_FOLDERS.yee)) {
        const yeeFolders = fs.readdirSync(IMAGE_FOLDERS.yee, { withFileTypes: true });
        for (const folder of yeeFolders) {
            if (folder.isDirectory()) {
                const folderPath = path.join(IMAGE_FOLDERS.yee, folder.name);
                const images = getImagesFromFolder(folderPath);
                if (images.length > 0) {
                    // Normalize folder name for matching (lowercase, handle variations)
                    const normalizedName = folder.name.toLowerCase().replace(/[-_\s]/g, '-');
                    mapping.set(normalizedName, {
                        folderName: folder.name,
                        folderPath,
                        brand: 'YEE',
                        images,
                    });

                    // Also add without dashes for flexible matching
                    const noDashes = normalizedName.replace(/-/g, '');
                    if (noDashes !== normalizedName) {
                        mapping.set(noDashes, {
                            folderName: folder.name,
                            folderPath,
                            brand: 'YEE',
                            images,
                        });
                    }
                }
            }
        }
    }

    // Scan HYGGER folders
    if (fs.existsSync(IMAGE_FOLDERS.hygger)) {
        const hyggerFolders = fs.readdirSync(IMAGE_FOLDERS.hygger, { withFileTypes: true });
        for (const folder of hyggerFolders) {
            if (folder.isDirectory()) {
                const folderPath = path.join(IMAGE_FOLDERS.hygger, folder.name);
                const images = getImagesFromFolder(folderPath);
                if (images.length > 0) {
                    const normalizedName = folder.name.toLowerCase().replace(/[-_\s]/g, '-');
                    mapping.set(normalizedName, {
                        folderName: folder.name,
                        folderPath,
                        brand: 'HYGGER',
                        images,
                    });

                    const noDashes = normalizedName.replace(/-/g, '');
                    if (noDashes !== normalizedName) {
                        mapping.set(noDashes, {
                            folderName: folder.name,
                            folderPath,
                            brand: 'HYGGER',
                            images,
                        });
                    }
                }
            }
        }
    }

    // Scan Houyi folders (these use English product names)
    if (fs.existsSync(IMAGE_FOLDERS.houyi)) {
        const houyiFolders = fs.readdirSync(IMAGE_FOLDERS.houyi, { withFileTypes: true });
        for (const folder of houyiFolders) {
            if (folder.isDirectory()) {
                const folderPath = path.join(IMAGE_FOLDERS.houyi, folder.name);
                const images = getImagesFromFolder(folderPath);
                if (images.length > 0) {
                    // Slugify the folder name for matching
                    const slugified = folder.name
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/^-|-$/g, '');
                    mapping.set(slugified, {
                        folderName: folder.name,
                        folderPath,
                        brand: 'Houyi',
                        images,
                    });
                }
            }
        }
    }

    return mapping;
}

/**
 * Try to find a matching folder for a product slug
 */
function findMatchingFolder(
    slug: string,
    productName: string,
    brand: string,
    folderMapping: Map<string, FolderMapping>
): FolderMapping | null {
    // Normalize slug
    const normalizedSlug = slug.toLowerCase().replace(/[-_\s]/g, '-');

    // Direct match
    if (folderMapping.has(normalizedSlug)) {
        return folderMapping.get(normalizedSlug)!;
    }

    // Try without dashes
    const noDashes = normalizedSlug.replace(/-/g, '');
    if (folderMapping.has(noDashes)) {
        return folderMapping.get(noDashes)!;
    }

    // Extract model code from slug (e.g., "yee-c1-1065-something" -> "c1-1065")
    const modelPatterns = [
        /\b(c\d+-\d+)\b/i,           // C1-1065
        /\b(hg-?\d+)\b/i,            // HG-957 or HG957
        /\b(hc-?\d+)\b/i,            // HC004
        /\b(yee-\d+)\b/i,            // YEE-3621
        /\b(yyh-\d+)\b/i,            // YYH-039
        /\b(yff-\d+)\b/i,            // YFF-042
        /\b(yklel-\d+)\b/i,          // YKL-018
        /\b(ylc-\d+)\b/i,            // YLC-409
        /\b(ysl-\d+)\b/i,            // YSL-506
        /\b(yan-\d+)\b/i,            // YAN-804
        /\b(pyd-\d+)\b/i,            // PYD-200
        /\b(nyh-\d+)\b/i,            // NYH-006
        /\b(ygg-\d+)\b/i,            // YGG-135
        /\b(ytz-\d+)\b/i,            // YTZ-300
        /\b(hgy\d+)\b/i,             // HGY0001
    ];

    for (const pattern of modelPatterns) {
        const match = slug.match(pattern) || productName.match(pattern);
        if (match) {
            const modelCode = match[1].toLowerCase().replace(/[-_\s]/g, '-');
            if (folderMapping.has(modelCode)) {
                return folderMapping.get(modelCode)!;
            }
            // Try without dashes
            const modelNoDashes = modelCode.replace(/-/g, '');
            if (folderMapping.has(modelNoDashes)) {
                return folderMapping.get(modelNoDashes)!;
            }
        }
    }

    return null;
}

/**
 * Copy images to public folder and return web paths
 */
function copyAndGetWebPaths(
    folder: FolderMapping,
    productSlug: string
): { thumbnail: string; images: string[] } {
    const brandFolder = folder.brand.toLowerCase();
    const destFolder = path.join(PUBLIC_IMAGES, brandFolder, productSlug);

    // Create destination folder if it doesn't exist
    if (!fs.existsSync(destFolder)) {
        fs.mkdirSync(destFolder, { recursive: true });
    }

    const webPaths: string[] = [];

    // Copy images (limit to 6 max)
    const imagesToCopy = folder.images.slice(0, 6);
    for (const image of imagesToCopy) {
        const srcPath = path.join(folder.folderPath, image);
        const destPath = path.join(destFolder, image);

        try {
            fs.copyFileSync(srcPath, destPath);
            webPaths.push(`/images/products/${brandFolder}/${productSlug}/${image}`);
        } catch (err) {
            console.error(`  ⚠ Failed to copy ${image}: ${err}`);
        }
    }

    return {
        thumbnail: webPaths[0] || '',
        images: webPaths,
    };
}

/**
 * Main function
 */
async function main() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║      FIX ALL PRODUCT IMAGES - إصلاح جميع صور المنتجات      ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Step 1: Build folder mapping
    console.log('📁 Scanning image folders...\n');
    const folderMapping = buildFolderMapping();
    console.log(`   Found ${folderMapping.size} unique folder mappings\n`);

    // Step 2: Fetch all products
    console.log('📦 Fetching products from database...\n');
    const products = await sql`
    SELECT id, slug, name, brand, thumbnail, images
    FROM products
    ORDER BY brand, slug
  ` as ProductData[];
    console.log(`   Found ${products.length} products\n`);

    // Step 3: Process each product
    console.log('🔄 Processing products...\n');

    let matched = 0;
    let cleared = 0;
    let errors = 0;
    const matchedProducts: string[] = [];
    const clearedProducts: string[] = [];

    for (const product of products) {
        const folder = findMatchingFolder(
            product.slug,
            product.name,
            product.brand,
            folderMapping
        );

        if (folder) {
            // Found matching folder - copy images and update
            try {
                const { thumbnail, images } = copyAndGetWebPaths(folder, product.slug);

                if (images.length > 0) {
                    await sql`
            UPDATE products
            SET thumbnail = ${thumbnail},
                images = ${JSON.stringify(images)}::jsonb,
                updated_at = NOW()
            WHERE id = ${product.id}
          `;

                    console.log(`✅ ${product.slug} → ${folder.folderName} (${images.length} images)`);
                    matched++;
                    matchedProducts.push(`${product.slug} (${product.name})`);
                }
            } catch (err) {
                console.error(`❌ Error updating ${product.slug}: ${err}`);
                errors++;
            }
        } else {
            // No matching folder - clear images
            try {
                await sql`
          UPDATE products
          SET thumbnail = '',
              images = '[]'::jsonb,
              updated_at = NOW()
          WHERE id = ${product.id}
        `;

                console.log(`🗑️  ${product.slug} - No matching folder, cleared images`);
                cleared++;
                clearedProducts.push(`${product.slug} (${product.name})`);
            } catch (err) {
                console.error(`❌ Error clearing ${product.slug}: ${err}`);
                errors++;
            }
        }
    }

    // Step 4: Print summary
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                         SUMMARY                           ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log(`📊 Total products: ${products.length}`);
    console.log(`✅ Matched with images: ${matched}`);
    console.log(`🗑️  Cleared (no match): ${cleared}`);
    console.log(`❌ Errors: ${errors}`);

    // Save report
    const report = {
        timestamp: new Date().toISOString(),
        totalProducts: products.length,
        matched,
        cleared,
        errors,
        matchedProducts,
        clearedProducts,
    };

    const reportPath = path.join(PROJECT_ROOT, 'image-fix-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📝 Report saved to: ${reportPath}`);
}

main().catch(console.error);
