/**
 * Script to update YEE product slugs to model codes and link images
 * Run with: npx tsx scripts/update-yee-slugs.ts
 */

import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import ws from "ws";
import * as fs from "fs";
import * as path from "path";

// Configure NEON
neonConfig.webSocketConstructor = ws;

const DATABASE_URL = 'postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool);

const YEE_FOLDER = './client/public/images/products/yee';

// Mapping from product ID patterns to model codes (folder names)
const productToModel: Record<string, string> = {
    'yee-small-fish-feed': 'C1-1113',
    'yee-goldfish-spirulina': 'C1-1127',
    'yee-betta-food-0.8mm': 'C1-1073',
    'yee-imitation-red-worm': 'C1-1082-5',
    'yee-floating-grain': 'C1-1065',
    'yee-shelled-eggs': 'YYY-078',
    'yee-hermit-crab': 'C1-1125',
    'yee-microparticles': 'C1-1082-2a',
    'yee-freeze-dried-brine': 'C1-1086',
    'yee-3-in-1-betta': 'C1-1124',
    'yee-white-spot': 'YYH-125',
    'yee-methylene-blue-600': 'YYH-207',
    'yee-probiotics-760': 'C2-1016',
    'yee-chlorine-stabilizer': 'YYH-039',
    'yee-anti-stress-500': 'YYH-173',
    'yee-ammonia-tester': 'C3-1010',
    'yee-nitrite-tester': 'C3-1010',
    'yee-9-in-1-test': 'C4-1123-1a',
    'yee-nitrifying-bacteria': 'C2-1005',
    'yee-algaecide': 'YYH-189',
    'yee-anti-stress-1000': 'YYH-216',
    'yee-multivitamin-mineral': 'YAN-804',
    'yee-multivitamin-salt-box': 'YAN-915',
    'yee-methylene-blue-235': 'YYH-053',
    'yee-9-in-1-refill': 'C4-1123-2a',
    'yee-heating-rod-50w': 'YEE-3006',
    'yee-heating-rod-100w': 'YEE-3007',
    'yee-heating-rod-200w': 'YEE-3008',
    'yee-quartz-heater': 'C4-1432',
    'yee-black-warrior': 'C4-1103',
    'yee-water-grass-mud': 'YFF-049',
    'yee-oxygen-pump': 'YTZ-300',
    'yee-bubble-diffuser': 'YGG-135',
    'yee-airbag': 'YEE-3621',
    'yee-low-water-heater': 'C4-1117',
    'yee-isolation-box': 'C4-1008',
    'yee-incubator': 'YSL-506',
    'yee-acrylic-incubator': 'YKL-018',
    'yee-filter-cotton': 'YLL-087',
    'yee-descaling': 'PYD-200',
    'yee-culture-ring': 'YFF-042',
    'yee-culture-brick': 'YAA-009',
    'yee-3d-filter': 'NYH-006',
    'yee-16-in-1-filter': 'YLC-410',
    'yee-6-in-1-filter': 'YLC-409',
    'yee-oil-film': 'C4-1067',
    'yee-thermometer': 'YEE-3606',
    'yee-glass-tank': 'AQUARIUMS',
    'yee-stream-tank': 'C5-1123',
    'yee-c1-1066': 'C1-1066',
    'yee-c1-1134': 'C1-1134',
    'yee-yyh-006': 'YYH-006',
};

function getImagesFromFolder(folderName: string): string[] {
    const folderPath = path.join(YEE_FOLDER, folderName);
    try {
        if (!fs.existsSync(folderPath)) return [];
        const files = fs.readdirSync(folderPath);
        return files
            .filter(f => /\.(jpg|jpeg|png|webp|avif|gif)$/i.test(f))
            .map(f => `/images/products/yee/${folderName}/${f}`);
    } catch {
        return [];
    }
}

async function main() {
    console.log('=== Updating YEE Product Slugs & Images ===\n');

    // Get all YEE products
    const products = await db.execute(sql`
    SELECT id, slug, name, images, thumbnail 
    FROM products 
    WHERE brand = 'YEE'
  `);

    console.log(`Found ${products.rows.length} YEE products\n`);

    // Get all available folders
    const availableFolders = fs.readdirSync(YEE_FOLDER)
        .filter(f => {
            try {
                return fs.statSync(path.join(YEE_FOLDER, f)).isDirectory();
            } catch { return false; }
        });

    console.log(`Image folders: ${availableFolders.join(', ')}\n`);

    let updated = 0;
    const noMatch: string[] = [];

    for (const product of products.rows as any[]) {
        const productId = product.id as string;
        const currentSlug = product.slug as string;

        // Find matching model code
        let modelCode: string | null = null;

        for (const [pattern, model] of Object.entries(productToModel)) {
            if (productId.toLowerCase().includes(pattern.toLowerCase()) ||
                currentSlug.toLowerCase().includes(pattern.toLowerCase())) {
                modelCode = model;
                break;
            }
        }

        // If no match found, try direct folder match
        if (!modelCode) {
            for (const folder of availableFolders) {
                if (productId.toLowerCase().includes(folder.toLowerCase()) ||
                    currentSlug.toLowerCase().includes(folder.toLowerCase())) {
                    modelCode = folder;
                    break;
                }
            }
        }

        if (modelCode) {
            const images = getImagesFromFolder(modelCode);

            if (images.length > 0) {
                // Create new slug from model code
                const newSlug = `yee-${modelCode.toLowerCase()}`;

                // Update product
                await db.execute(sql`
          UPDATE products 
          SET slug = ${newSlug},
              images = ${JSON.stringify(images)}::jsonb,
              thumbnail = ${images[0]},
              updated_at = NOW()
          WHERE id = ${productId}
        `);

                console.log(`✅ ${productId}`);
                console.log(`   Slug: ${currentSlug} -> ${newSlug}`);
                console.log(`   Images: ${images.length}`);
                updated++;
            } else {
                console.log(`⚠️ ${productId} - Model ${modelCode} folder has no images`);
                noMatch.push(productId);
            }
        } else {
            console.log(`❌ ${productId} - No model match found`);
            noMatch.push(productId);
        }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Updated: ${updated}`);
    console.log(`No match: ${noMatch.length}`);

    await pool.end();
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
