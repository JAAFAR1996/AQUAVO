/**
 * Search for images in all available folders and match with remaining products
 */
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

// Products that need images
const REMAINING_PRODUCTS = [
    // Houyi products
    { id: 'houyi-thai-branches', name: 'أغصان تايلندية مقشرة', searchTerms: ['thai', 'branch', 'wood'] },
    { id: 'houyi-inflatable-fish-bag', name: 'أكياس نقل سمك قابلة للنفخ', searchTerms: ['bag', 'inflatable', 'transport'] },
    { id: 'houyi-rhododendron-30-35cm', name: 'جذر الرودودندرون', searchTerms: ['rhododendron', 'root', 'wood'] },
    { id: 'houyi-mountain-wood', name: 'خشب الجبل 20-50 سم', searchTerms: ['mountain', 'wood', 'driftwood'] },
    { id: 'houyi-polished-driftwood-5-8cm', name: 'خشب عائم مصقول', searchTerms: ['polished', 'driftwood', 'wood'] },
    { id: 'houyi-sinking-wood-large', name: 'خشب غارق كبير 70-120 سم', searchTerms: ['sinking', 'wood', 'large'] },
    { id: 'houyi-water-changer-siphon', name: 'سيفون تغيير مياه 3 في 1', searchTerms: ['siphon', 'water', 'changer'] },
    { id: 'houyi-wave-pump', name: 'مضخة موجات Songbao WP-50M', searchTerms: ['pump', 'wave', 'songbao'] },
    // YEE products  
    { id: 'yee-glass-tank', name: 'YEE حوض زجاجي شفاف', searchTerms: ['glass', 'tank', 'aquarium', '3006', '3007', '3008'] },
    { id: 'yee-tank-601515', name: 'YEE حوض سمك جانبي', searchTerms: ['tank', '601515', 'side'] },
    { id: 'yee-air-tube-reinforced', name: 'YEE خرطوم هواء مقوى', searchTerms: ['air', 'tube', 'hose'] },
    { id: 'yee-steel-heater', name: 'YEE سخان ستيل', searchTerms: ['heater', 'steel', '304'] },
    { id: 'yee-3656-tubing', name: 'أنبوب بلاستيكي مقوى', searchTerms: ['3656', 'tube', 'plastic'] },
    { id: 'yee-led-318-light', name: 'إضاءة LED ثلاثية الألوان', searchTerms: ['led', '318', 'light'] },
    { id: 'yee-c1-1127-ranchu-feed', name: 'علف ذهبية رانشو بالسبيرولينا', searchTerms: ['c1-1127', 'ranchu', 'feed', '1127'] },
    { id: 'yee-c1-1134-ranchu-sinking', name: 'علف ذهبية رانشو غارق', searchTerms: ['c1-1134', 'ranchu', 'sinking', '1134'] },
    { id: 'yee-yyh-006-antibacterial', name: 'مسحوق مضاد للبكتيريا', searchTerms: ['yyh-006', 'antibacterial', 'powder'] },
    { id: 'yee-cylinder-air-stone', name: 'YEE حجر هواء أسطواني', searchTerms: ['air', 'stone', 'cylinder'] },
    { id: 'yee-sponge-filter', name: 'YEE فلتر إسفنجي', searchTerms: ['sponge', 'filter'] },
    { id: 'yee-uk-plug-adapter', name: 'محول كهرباء UK', searchTerms: ['uk', 'plug', 'adapter'] },
    { id: 'yee-battery-air-pump', name: 'SOBO مضخة هواء', searchTerms: ['battery', 'air', 'pump', 'sobo'] },
];

// All image source directories
const IMAGE_SOURCES = [
    { path: 'C:/Users/jaafa/Desktop/upload/FishWebClean/Houyi', brand: 'houyi' },
    { path: 'C:/Users/jaafa/Desktop/upload/FishWebClean/yee', brand: 'yee' },
    { path: 'C:/Users/jaafa/Desktop/upload/FishWebClean/HYGGER', brand: 'hygger' },
];

function getAllImageFolders(basePath: string): { name: string; path: string; images: string[] }[] {
    const result: { name: string; path: string; images: string[] }[] = [];

    if (!fs.existsSync(basePath)) return result;

    const items = fs.readdirSync(basePath, { withFileTypes: true });

    for (const item of items) {
        if (item.isDirectory()) {
            const folderPath = path.join(basePath, item.name);
            const images = fs.readdirSync(folderPath).filter(f =>
                /\.(jpg|jpeg|png|webp|avif)$/i.test(f)
            );
            result.push({ name: item.name, path: folderPath, images });
        }
    }

    return result;
}

async function searchAndMatch() {
    console.log("🔍 Searching for images in all source folders...\n");

    // Collect all available folders
    const allFolders: { name: string; path: string; images: string[]; brand: string }[] = [];

    for (const source of IMAGE_SOURCES) {
        const folders = getAllImageFolders(source.path);
        for (const folder of folders) {
            allFolders.push({ ...folder, brand: source.brand });
        }
    }

    console.log(`Found ${allFolders.length} image folders total\n`);

    // Search for matches
    console.log("=".repeat(70));
    console.log("🔗 Potential Matches Found:");
    console.log("=".repeat(70));

    const matches: { productId: string; productName: string; folder: string; images: number; brand: string; folderPath: string }[] = [];

    for (const product of REMAINING_PRODUCTS) {
        const folderMatches: typeof allFolders = [];

        for (const folder of allFolders) {
            const folderLower = folder.name.toLowerCase();

            for (const term of product.searchTerms) {
                if (folderLower.includes(term.toLowerCase())) {
                    folderMatches.push(folder);
                    break;
                }
            }
        }

        if (folderMatches.length > 0) {
            // Take the first match with images
            const bestMatch = folderMatches.find(f => f.images.length > 0) || folderMatches[0];
            if (bestMatch && bestMatch.images.length > 0) {
                matches.push({
                    productId: product.id,
                    productName: product.name,
                    folder: bestMatch.name,
                    images: bestMatch.images.length,
                    brand: bestMatch.brand,
                    folderPath: bestMatch.path,
                });
                console.log(`\n✅ ${product.name}`);
                console.log(`   ID: ${product.id}`);
                console.log(`   → Folder: ${bestMatch.name} (${bestMatch.images.length} images)`);
            }
        } else {
            console.log(`\n❌ ${product.name}`);
            console.log(`   No matching folder found`);
        }
    }

    // Show folders that might contain relevant images
    console.log("\n\n" + "=".repeat(70));
    console.log("📁 All Available Folders (for manual review):");
    console.log("=".repeat(70));

    for (const source of IMAGE_SOURCES) {
        console.log(`\n[${source.brand.toUpperCase()}] ${source.path}:`);
        const folders = getAllImageFolders(source.path);
        for (const folder of folders.filter(f => f.images.length > 0)) {
            console.log(`  📂 ${folder.name} (${folder.images.length} images)`);
        }
    }

    // Link found matches
    if (matches.length > 0) {
        console.log("\n\n" + "=".repeat(70));
        console.log("🔗 Linking matched products...");
        console.log("=".repeat(70));

        const targetBasePath = 'C:/Users/jaafa/Desktop/upload/FishWebClean/client/public/images/products';
        let linked = 0;

        for (const match of matches) {
            const targetFolder = path.join(targetBasePath, match.brand, match.productId);

            if (!fs.existsSync(targetFolder)) {
                fs.mkdirSync(targetFolder, { recursive: true });
            }

            const sourceFiles = fs.readdirSync(match.folderPath).filter(f =>
                /\.(jpg|jpeg|png|webp|avif)$/i.test(f)
            );

            const newImages: string[] = [];
            for (const file of sourceFiles) {
                const sourcePath = path.join(match.folderPath, file);
                const targetPath = path.join(targetFolder, file);

                try {
                    if (!fs.existsSync(targetPath)) {
                        fs.copyFileSync(sourcePath, targetPath);
                    }
                    newImages.push(`/images/products/${match.brand}/${match.productId}/${file}`);
                } catch (err) {
                    console.log(`  Error: ${err}`);
                }
            }

            if (newImages.length > 0) {
                try {
                    await sql`
                        UPDATE products 
                        SET images = ${JSON.stringify(newImages)}::jsonb,
                            thumbnail = ${newImages[0]}
                        WHERE id = ${match.productId}
                    `;
                    console.log(`✅ ${match.productId}: ${newImages.length} images`);
                    linked++;
                } catch (err) {
                    console.log(`❌ DB Error: ${err}`);
                }
            }
        }

        console.log(`\n📊 Linked ${linked} additional products`);
    }

    // Final count
    const remaining = await sql`
        SELECT COUNT(*) as count
        FROM products 
        WHERE (images IS NULL OR jsonb_array_length(images) = 0) 
        AND (thumbnail IS NULL OR thumbnail = '')
    `;

    console.log(`\n📊 Remaining products without images: ${remaining[0].count}`);
}

searchAndMatch().catch(console.error);
