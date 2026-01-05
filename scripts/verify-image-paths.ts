/**
 * Verify and Fix Product Image Paths in Database
 * 
 * Checks that each product's thumbnail points to an existing file
 */

import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.production' });

const sql = neon(process.env.DATABASE_URL!);

const PUBLIC_ROOT = 'C:/Users/jaafa/Desktop/upload/FishWebClean/client/public';

interface Product {
    id: string;
    slug: string;
    name: string;
    brand: string;
    thumbnail: string;
    images: string[];
}

async function main() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   VERIFY & FIX IMAGE PATHS - التحقق من مسارات الصور      ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Get all products
    const products = await sql`
    SELECT id, slug, name, brand, thumbnail, images
    FROM products
    WHERE thumbnail IS NOT NULL AND thumbnail != ''
    ORDER BY brand, slug
  ` as Product[];

    console.log(`📦 Found ${products.length} products with thumbnails\n`);

    let valid = 0;
    let invalid = 0;
    let fixed = 0;
    const invalidProducts: string[] = [];

    for (const product of products) {
        const thumbPath = path.join(PUBLIC_ROOT, product.thumbnail);

        if (fs.existsSync(thumbPath)) {
            valid++;
        } else {
            // Thumbnail doesn't exist - try to find the correct folder
            const brandFolder = product.brand.toLowerCase().includes('hygger') ? 'hygger' :
                product.brand.toLowerCase().includes('yee') ? 'yee' :
                    product.brand.toLowerCase().includes('houyi') ? 'houyi' : null;

            if (brandFolder) {
                const productFolder = path.join(PUBLIC_ROOT, 'images/products', brandFolder, product.slug);

                if (fs.existsSync(productFolder)) {
                    // Find first image in folder
                    const files = fs.readdirSync(productFolder).filter(f =>
                        /\.(png|jpg|jpeg|webp|avif|gif)$/i.test(f)
                    );

                    if (files.length > 0) {
                        const newImages = files.slice(0, 6).map(f =>
                            `/images/products/${brandFolder}/${product.slug}/${f}`
                        );
                        const newThumb = newImages[0];

                        // Update database
                        await sql`
              UPDATE products
              SET thumbnail = ${newThumb},
                  images = ${JSON.stringify(newImages)}::jsonb,
                  updated_at = NOW()
              WHERE id = ${product.id}
            `;

                        console.log(`🔧 Fixed: ${product.slug} → ${newThumb}`);
                        fixed++;
                        continue;
                    }
                }
            }

            console.log(`❌ Invalid: ${product.slug} → ${product.thumbnail}`);
            invalidProducts.push(`${product.slug} (${product.thumbnail})`);
            invalid++;
        }
    }

    console.log('\n════════════════════════════════════════════════════════════');
    console.log(`✅ Valid paths: ${valid}`);
    console.log(`🔧 Fixed paths: ${fixed}`);
    console.log(`❌ Invalid paths: ${invalid}`);

    if (invalidProducts.length > 0) {
        console.log('\n❌ Products with invalid paths:');
        invalidProducts.forEach(p => console.log(`   - ${p}`));
    }
}

main().catch(console.error);
