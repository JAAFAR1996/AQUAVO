/**
 * Script to update Houyi product images
 * Run with: npx tsx scripts/update-houyi-images.ts
 */

import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import ws from "ws";
import * as fs from "fs";
import * as path from "path";

neonConfig.webSocketConstructor = ws;

const DATABASE_URL = 'postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool);

const HOUYI_FOLDER = './client/public/images/products/houyi';

// Product ID -> Image folder mapping for Houyi
const productFolderMapping: Record<string, string> = {
    'houyi-air-distributor-4port': '4 port blue & 6port blue',
    'houyi-air-distributor-6port': '4 port blue & 6port blue',
    'houyi-base-fertilizer': 'Aquatic plants',
    'houyi-connector-i-4mm': '4mm T& 4mm I &4mm Y',
    'houyi-connector-t-4mm': '4mm T& 4mm I &4mm Y',
    'houyi-connector-y-4mm': '4mm T& 4mm I &4mm Y',
    'houyi-control-valve-4mm': 'Control valve 4mm',
    'houyi-instant-glue-50g': 'Moss glue 5g green&White Moss Glue 20g White& glue White 50g',
    'houyi-led-thermometer': 'led屏显温度计',
    'houyi-medium-cotton-brown': 'Medium cotton grey 50g & Medium cotton brown 50g',
    'houyi-medium-cotton-grey': 'Medium cotton grey 50g & Medium cotton brown 50g',
    'houyi-moss-tree': 'Aquatic plants',
    'houyi-mountain-wood': 'Aquatic plants',
    'houyi-polished-driftwood-10-15cm': 'Aquatic plants',
    'houyi-polished-driftwood-15-20cm': 'Aquatic plants',
    'houyi-polished-driftwood-5-8cm': 'Aquatic plants',
    'houyi-polished-driftwood-8-10cm': 'Aquatic plants',
    'houyi-rhododendron-30-35cm': 'Aquatic plants',
    'houyi-rhododendron-40-45cm': 'Aquatic plants',
    'houyi-rhododendron-50-55cm': 'Aquatic plants',
    'houyi-rhododendron-with-base': 'Aquatic plants',
    'houyi-sinking-wood-large': 'Aquatic plants',
    'houyi-thai-branches': 'Aquatic plants',
};

function getImagesFromFolder(folderName: string): string[] {
    const folderPath = path.join(HOUYI_FOLDER, folderName);
    try {
        if (!fs.existsSync(folderPath)) return [];
        const files = fs.readdirSync(folderPath);
        return files
            .filter(f => /\.(jpg|jpeg|png|webp|avif|gif)$/i.test(f))
            .map(f => `/images/products/houyi/${encodeURIComponent(folderName)}/${f}`);
    } catch {
        return [];
    }
}

// Get all available folders
function listAvailableFolders(): string[] {
    try {
        return fs.readdirSync(HOUYI_FOLDER)
            .filter(f => {
                try {
                    return fs.statSync(path.join(HOUYI_FOLDER, f)).isDirectory();
                } catch { return false; }
            });
    } catch {
        return [];
    }
}

async function main() {
    console.log('=== Updating Houyi Product Images ===\n');

    const availableFolders = listAvailableFolders();
    console.log(`Available folders: ${availableFolders.length}\n`);

    // Get all Houyi products
    const products = await db.execute(sql`
    SELECT id, slug, name, images 
    FROM products 
    WHERE brand = 'Houyi'
  `);

    console.log(`Found ${products.rows.length} Houyi products\n`);

    let updated = 0;
    const noImages: string[] = [];

    for (const product of products.rows as any[]) {
        const productId = product.id as string;
        const folderName = productFolderMapping[productId];

        if (folderName) {
            const images = getImagesFromFolder(folderName);

            if (images.length > 0) {
                await db.execute(sql`
          UPDATE products 
          SET images = ${JSON.stringify(images)}::jsonb,
              thumbnail = ${images[0]},
              updated_at = NOW()
          WHERE id = ${productId}
        `);

                console.log(`✅ ${productId} -> ${folderName} (${images.length} images)`);
                updated++;
            } else {
                console.log(`⚠️ ${productId} - No images in "${folderName}"`);
                noImages.push(productId);
            }
        } else {
            // Try to find matching folder by name
            let found = false;
            for (const folder of availableFolders) {
                if (productId.toLowerCase().includes(folder.toLowerCase().substring(0, 10)) ||
                    folder.toLowerCase().includes(productId.split('-').slice(-1)[0])) {
                    const images = getImagesFromFolder(folder);
                    if (images.length > 0) {
                        await db.execute(sql`
              UPDATE products 
              SET images = ${JSON.stringify(images)}::jsonb,
                  thumbnail = ${images[0]},
                  updated_at = NOW()
              WHERE id = ${productId}
            `);
                        console.log(`✅ ${productId} -> ${folder} (${images.length} images)`);
                        updated++;
                        found = true;
                        break;
                    }
                }
            }

            if (!found) {
                console.log(`❌ ${productId} - No folder match`);
                noImages.push(productId);
            }
        }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Updated: ${updated}`);
    console.log(`No images: ${noImages.length}`);

    await pool.end();
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
