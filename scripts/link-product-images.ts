/**
 * Complete mapping and linking of products with their image folders
 */
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

// Complete Houyi mappings based on analysis
const HOUYI_MAPPINGS: Record<string, string> = {
    'houyi-oxygenation-tube': 'oxygenation tube',
    'houyi-tracheal-suction': 'Tracheal suction cup',
    'houyi-moss-tree': 'Moss Line',
    'houyi-acrylic-pump-compartment': 'Acrylic tool rack', // closest
    'houyi-tool-kit': 'Aquarium Fish Tank Five-in-one Cleaning Tool Fish Net Scraper Algae Knife Aquatic Clip',
    'houyi-koi-fish-net': 'Aquarium Fish Tank Stainless Steel Telescopic Square Fishnet Three-section Fishing Net  MEDIAM',
    'houyi-base-fertilizer': 'Aquatic plants',
    // These don't have matching folders:
    // 'houyi-thai-branches' - no match
    // 'houyi-inflatable-fish-bag' - no match  
    // 'houyi-rhododendron-30-35cm' - no match
    // 'houyi-mountain-wood' - no match
    // 'houyi-polished-driftwood-5-8cm' - no match
    // 'houyi-sinking-wood-large' - no match
    // 'houyi-water-changer-siphon' - no match
    // 'houyi-wave-pump' - no match (Songbao brand)
};

// YEE mappings (by product code)
const YEE_MAPPINGS: Record<string, string> = {
    'yee-c1-1127-ranchu-feed': 'C1-1127',
    'yee-yyy-078-brine-shrimp-eggs': 'YYY-078',
    'yee-new-shelled-eggs-140g-200ml-white-bottle-feeder': 'YYY-078',
    'yee-acrylic-incubator-201010': 'YKL-018',
    'yee-high-energy-culture-bricks': 'YAA-009',
    'yee-blue-new-upgraded-6d-filter-cotton-5040-two-pieces': 'YLL-087',
    'yee-c1-1066-shrimp-food': 'C1-1065', // closest
    'yee-c1-1069-sample-pack': 'C1-1073', // closest
    'yee-c1-1134-ranchu-sinking': 'C1-1127', // same product line
    'yee-cls-107-magnetic-brush': 'YGG-135', // cleaning tools
};

async function linkImages() {
    console.log("🔗 Linking products with image folders...\n");

    const houyiRootPath = 'C:/Users/jaafa/Desktop/upload/FishWebClean/Houyi';
    const yeeRootPath = 'C:/Users/jaafa/Desktop/upload/FishWebClean/yee';
    const targetBasePath = 'C:/Users/jaafa/Desktop/upload/FishWebClean/client/public/images/products';

    let updated = 0;
    let skipped = 0;
    const results: { product: string; status: string; images: number }[] = [];

    // Process Houyi mappings
    console.log("📦 Processing Houyi products...\n");

    for (const [productId, folderName] of Object.entries(HOUYI_MAPPINGS)) {
        const folderPath = path.join(houyiRootPath, folderName);

        if (!fs.existsSync(folderPath)) {
            console.log(`⚠️ Folder not found: ${folderName}`);
            skipped++;
            results.push({ product: productId, status: 'folder_not_found', images: 0 });
            continue;
        }

        const imageFiles = fs.readdirSync(folderPath).filter(f =>
            /\.(jpg|jpeg|png|webp|avif)$/i.test(f)
        );

        if (imageFiles.length === 0) {
            console.log(`⚠️ No images in: ${folderName}`);
            skipped++;
            results.push({ product: productId, status: 'no_images', images: 0 });
            continue;
        }

        // Create slug from product ID
        const slug = productId;
        const targetFolder = path.join(targetBasePath, 'houyi', slug);

        if (!fs.existsSync(targetFolder)) {
            fs.mkdirSync(targetFolder, { recursive: true });
        }

        // Copy images
        const newImages: string[] = [];
        for (const file of imageFiles) {
            const sourcePath = path.join(folderPath, file);
            const targetPath = path.join(targetFolder, file);

            try {
                if (!fs.existsSync(targetPath)) {
                    fs.copyFileSync(sourcePath, targetPath);
                }
                const webPath = `/images/products/houyi/${slug}/${file}`;
                newImages.push(webPath);
            } catch (err) {
                console.log(`  Error copying ${file}: ${err}`);
            }
        }

        if (newImages.length > 0) {
            // Update database
            const thumbnail = newImages[0];

            try {
                await sql`
                    UPDATE products 
                    SET images = ${JSON.stringify(newImages)}::jsonb,
                        thumbnail = ${thumbnail}
                    WHERE id = ${productId}
                `;
                console.log(`✅ ${productId}: ${newImages.length} images linked`);
                updated++;
                results.push({ product: productId, status: 'success', images: newImages.length });
            } catch (err) {
                console.log(`❌ DB error for ${productId}: ${err}`);
                skipped++;
                results.push({ product: productId, status: 'db_error', images: 0 });
            }
        }
    }

    // Process YEE mappings
    console.log("\n📦 Processing YEE products...\n");

    for (const [productId, folderName] of Object.entries(YEE_MAPPINGS)) {
        const folderPath = path.join(yeeRootPath, folderName);

        if (!fs.existsSync(folderPath)) {
            console.log(`⚠️ Folder not found: ${folderName}`);
            skipped++;
            results.push({ product: productId, status: 'folder_not_found', images: 0 });
            continue;
        }

        const imageFiles = fs.readdirSync(folderPath).filter(f =>
            /\.(jpg|jpeg|png|webp|avif)$/i.test(f)
        );

        if (imageFiles.length === 0) {
            console.log(`⚠️ No images in: ${folderName}`);
            skipped++;
            results.push({ product: productId, status: 'no_images', images: 0 });
            continue;
        }

        const slug = productId;
        const targetFolder = path.join(targetBasePath, 'yee', slug);

        if (!fs.existsSync(targetFolder)) {
            fs.mkdirSync(targetFolder, { recursive: true });
        }

        const newImages: string[] = [];
        for (const file of imageFiles) {
            const sourcePath = path.join(folderPath, file);
            const targetPath = path.join(targetFolder, file);

            try {
                if (!fs.existsSync(targetPath)) {
                    fs.copyFileSync(sourcePath, targetPath);
                }
                const webPath = `/images/products/yee/${slug}/${file}`;
                newImages.push(webPath);
            } catch (err) {
                console.log(`  Error copying ${file}: ${err}`);
            }
        }

        if (newImages.length > 0) {
            const thumbnail = newImages[0];

            try {
                await sql`
                    UPDATE products 
                    SET images = ${JSON.stringify(newImages)}::jsonb,
                        thumbnail = ${thumbnail}
                    WHERE id = ${productId}
                `;
                console.log(`✅ ${productId}: ${newImages.length} images linked`);
                updated++;
                results.push({ product: productId, status: 'success', images: newImages.length });
            } catch (err) {
                console.log(`❌ DB error for ${productId}: ${err}`);
                skipped++;
                results.push({ product: productId, status: 'db_error', images: 0 });
            }
        }
    }

    console.log("\n" + "=".repeat(60));
    console.log(`📊 Results: ${updated} updated, ${skipped} skipped`);
    console.log("=".repeat(60));

    // Show remaining products without images
    console.log("\n❌ Products still without images (need manual matching):");

    const remaining = await sql`
        SELECT id, name, brand 
        FROM products 
        WHERE (images IS NULL OR jsonb_array_length(images) = 0) 
        AND (thumbnail IS NULL OR thumbnail = '')
        ORDER BY brand, name
    `;

    for (const p of remaining) {
        console.log(`  [${p.brand}] ${p.name} (${p.id})`);
    }
}

linkImages().catch(console.error);
