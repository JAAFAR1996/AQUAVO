/**
 * Script to investigate Houyi product images
 */
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

async function investigate() {
    console.log("🔍 Investigating Houyi brand product images...\n");

    // 1. Get all brands with image statistics
    console.log("📊 Brand Image Statistics:");
    console.log("=".repeat(80));

    const brandStats = await sql`
        SELECT 
            brand,
            COUNT(*) as total,
            COUNT(CASE WHEN images IS NOT NULL AND jsonb_array_length(images) > 0 THEN 1 END) as with_images,
            COUNT(CASE WHEN thumbnail IS NOT NULL AND thumbnail != '' THEN 1 END) as with_thumbnail
        FROM products 
        GROUP BY brand 
        ORDER BY total DESC
    `;

    console.table(brandStats);

    // 2. Sample Houyi products
    console.log("\n🏷️ Sample Houyi Products:");
    console.log("=".repeat(80));

    const houyiProducts = await sql`
        SELECT id, name, images, thumbnail 
        FROM products 
        WHERE brand = 'Houyi' 
        LIMIT 5
    `;

    for (const p of houyiProducts) {
        console.log(`\n📦 ${p.name}`);
        console.log(`   Images: ${p.images ? JSON.stringify(p.images).substring(0, 100) + '...' : '❌ NULL'}`);
        console.log(`   Thumbnail: ${p.thumbnail ? p.thumbnail.substring(0, 80) + '...' : '❌ NULL'}`);
    }

    // 3. Products WITHOUT images
    console.log("\n\n❌ Products WITHOUT images (sample):");
    console.log("=".repeat(80));

    const noImageProducts = await sql`
        SELECT id, name, brand, images, thumbnail 
        FROM products 
        WHERE (images IS NULL OR jsonb_array_length(images) = 0) 
        AND (thumbnail IS NULL OR thumbnail = '')
        LIMIT 10
    `;

    if (noImageProducts.length === 0) {
        console.log("✅ All products have at least one image!");
    } else {
        for (const p of noImageProducts) {
            console.log(`📦 [${p.brand}] ${p.name}`);
        }
    }

    // 4. Check thumbnail URL patterns
    console.log("\n\n🔗 Thumbnail URL Patterns:");
    console.log("=".repeat(80));

    const imagePatterns = await sql`
        SELECT 
            CASE 
                WHEN thumbnail LIKE '%cloudflare%' THEN 'Cloudflare R2'
                WHEN thumbnail LIKE '%/images/%' THEN 'Local /images/'
                WHEN thumbnail LIKE '%aquavo%' OR thumbnail LIKE '%AQUAVO%' THEN 'AQUAVO Placeholder'
                WHEN thumbnail IS NULL OR thumbnail = '' THEN 'NO THUMBNAIL'
                ELSE 'Other CDN'
            END as pattern,
            COUNT(*) as count
        FROM products
        GROUP BY 1
        ORDER BY count DESC
    `;

    console.table(imagePatterns);

    // 5. Sample thumbnails from different brands
    console.log("\n\n🖼️ Sample Thumbnails by Brand:");
    console.log("=".repeat(80));

    const sampleByBrand = await sql`
        SELECT DISTINCT ON (brand) brand, name, thumbnail
        FROM products
        WHERE thumbnail IS NOT NULL AND thumbnail != ''
        ORDER BY brand, id
    `;

    for (const p of sampleByBrand) {
        console.log(`[${p.brand}] ${p.name.substring(0, 40)}`);
        console.log(`   → ${p.thumbnail}`);
        console.log();
    }
}

investigate().catch(console.error);
