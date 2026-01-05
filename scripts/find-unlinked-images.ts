/**
 * Script to find unlinked images for products
 */
import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

async function findUnlinkedImages() {
    console.log("🔍 Finding products without images and available image folders...\n");

    // 1. Get products without images
    const productsWithoutImages = await sql`
        SELECT id, name, brand, slug, images, thumbnail 
        FROM products 
        WHERE (images IS NULL OR jsonb_array_length(images) = 0) 
        AND (thumbnail IS NULL OR thumbnail = '')
        ORDER BY brand, name
    `;

    console.log(`❌ Products WITHOUT images: ${productsWithoutImages.length}\n`);
    console.log("=".repeat(80));

    for (const p of productsWithoutImages) {
        console.log(`[${p.brand}] ${p.name}`);
        console.log(`   ID: ${p.id} | Slug: ${p.slug || 'NO SLUG'}`);
    }

    // 2. Check root Houyi folder for available images
    console.log("\n\n📁 Available Image Folders in /Houyi/:");
    console.log("=".repeat(80));

    const houyiRootPath = 'C:/Users/jaafa/Desktop/upload/FishWebClean/Houyi';

    if (fs.existsSync(houyiRootPath)) {
        const folders = fs.readdirSync(houyiRootPath, { withFileTypes: true })
            .filter(d => d.isDirectory())
            .map(d => d.name);

        console.log(`Found ${folders.length} image folders:\n`);

        for (const folder of folders) {
            const folderPath = path.join(houyiRootPath, folder);
            const files = fs.readdirSync(folderPath).filter(f =>
                f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.webp') || f.endsWith('.avif')
            );
            console.log(`📂 ${folder}`);
            console.log(`   Images: ${files.length} files`);
            if (files.length > 0) {
                console.log(`   Sample: ${files[0]}`);
            }
        }
    }

    // 3. Check YEE folder
    console.log("\n\n📁 Available Image Folders in /yee/:");
    console.log("=".repeat(80));

    const yeeRootPath = 'C:/Users/jaafa/Desktop/upload/FishWebClean/yee';

    if (fs.existsSync(yeeRootPath)) {
        const folders = fs.readdirSync(yeeRootPath, { withFileTypes: true })
            .filter(d => d.isDirectory())
            .map(d => d.name);

        console.log(`Found ${folders.length} image folders:\n`);

        for (const folder of folders.slice(0, 10)) {
            const folderPath = path.join(yeeRootPath, folder);
            const files = fs.readdirSync(folderPath).filter(f =>
                f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.webp') || f.endsWith('.avif')
            );
            console.log(`📂 ${folder} (${files.length} images)`);
        }
        if (folders.length > 10) {
            console.log(`... and ${folders.length - 10} more folders`);
        }
    }

    // 4. Suggest matches
    console.log("\n\n🔗 Potential Matches:");
    console.log("=".repeat(80));

    const houyiFolders = fs.existsSync(houyiRootPath) ?
        fs.readdirSync(houyiRootPath, { withFileTypes: true })
            .filter(d => d.isDirectory())
            .map(d => d.name.toLowerCase()) : [];

    const houyiProducts = productsWithoutImages.filter(p => p.brand === 'Houyi');

    for (const product of houyiProducts) {
        const productName = product.name.toLowerCase();

        // Try to find matching folder
        const possibleMatches = houyiFolders.filter(folder => {
            const folderLower = folder.toLowerCase();
            // Check if any significant word matches
            const keywords = ['ceramic', 'ring', 'acrylic', 'pump', 'wood', 'moss', 'net', 'mesh',
                'thermometer', 'cotton', 'sand', 'volcano', 'check', 'valve', 'hose', 'clamp',
                'glue', 'brush', 'feeding', 'leaves', 'suction', 'oxygen', 'tube'];

            for (const kw of keywords) {
                if (productName.includes(kw) && folderLower.includes(kw)) {
                    return true;
                }
            }
            return false;
        });

        if (possibleMatches.length > 0) {
            console.log(`\n✅ ${product.name}`);
            console.log(`   Possible folders: ${possibleMatches.join(', ')}`);
        } else {
            console.log(`\n❓ ${product.name}`);
            console.log(`   No automatic match found`);
        }
    }
}

findUnlinkedImages().catch(console.error);
