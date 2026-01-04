/**
 * Fix Houyi Product Images
 * 
 * Uses keyword matching to link Houyi products to their image folders
 */

import { neon } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.production' });

const sql = neon(process.env.DATABASE_URL!);

const PROJECT_ROOT = 'C:/Users/jaafa/Desktop/upload/FishWebClean';
const HOUYI_FOLDER = path.join(PROJECT_ROOT, 'Houyi');
const PUBLIC_IMAGES = path.join(PROJECT_ROOT, 'client/public/images/products/houyi');
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif'];

// Manual mapping: product slug -> Houyi folder name
const HOUYI_MAPPING: { [slug: string]: string } = {
    'houyi-hose-brush': '1.55m double-ended spring brush (blue)Hose brush',
    'houyi-air-distributor-4port': '4 port blue & 6port blue',
    'houyi-connectors-4mm': '4mm T& 4mm I &4mm Y',
    'houyi-acrylic-tool-rack': 'Acrylic tool rack',
    'houyi-activated-carbon': 'Activated carbon',
    'houyi-5-in-1-cleaning-tool': 'Aquarium Fish Tank Five-in-one Cleaning Tool Fish Net Scraper Algae Knife Aquatic Clip',
    'houyi-telescopic-fishnet': 'Aquarium Fish Tank Stainless Steel Telescopic Square Fishnet Three-section Fishing Net  MEDIAM',
    'houyi-aquatic-plants': 'Aquatic plants',
    'houyi-ceramic-ring': 'Ceramic ring',
    'houyi-check-valve': 'Check valve round red',
    'houyi-chubby-thermometer': 'Chubby thermometer',
    'houyi-oxygenation-tube': 'Color oxygenation tube  4M 5 PIC BLACK   5 PIC WHITE',
    'houyi-control-valve-4mm': 'Control valve 4mm',
    'houyi-dophin-electric-skimmer': 'DoPhin Electric Skimmer',
    'houyi-dutch-sand': 'Dutch Sand',
    'houyi-fat-injection': 'Fat injection',
    'houyi-feeding-cup': 'Feeding cup GREEN & WHITE',
    'houyi-foam-glue': 'Foam Glue',
    'houyi-gauze-isolation-net': 'Gauze isolation net',
    'houyi-hose-clamp': 'Hose clamp    With packaging-blue',
    'houyi-medium-cotton': 'Medium cotton grey 50g & Medium cotton brown 50g',
    'houyi-mesh': 'Mesh 8cm',
    'houyi-moss-line': 'Moss Line',
    'houyi-instant-glue-50g': 'Moss glue 5g green&White Moss Glue 20g White& glue White 50g',
    'houyi-net-bag': 'Net bag BLACK & WHITE',
    'houyi-planting-ring': 'Planting ring 52×26mm',
    'houyi-pumice': 'Pumice Small bag3-6mm',
    'houyi-river-sand': 'River sand 1-2mm',
    'houyi-silicone-121': 'Silicone 121',
    'houyi-south-american-sand': 'South American Sands  BLACK & RED',
    'houyi-sucker-buckle': 'Stainless steel shunt 4 & 6',
    'houyi-terminalia-leaves': 'Terminalia Leaves',
    'houyi-tracheal-suction-cup': 'Tracheal suction cup',
    'houyi-white-cotton': 'White cotton 30×50×2.5',
    'houyi-white-sand': 'White sand',
    'houyi-cleaning-towel': 'fish tank cleaning towel',
    'houyi-led': 'led屏显温度计',
    'houyi-nylon-fishing-net': 'small Wholesale Aquarium Special Nylon Fishing Net',
    'houyi-stream-sand': 'stream sand',
    'houyi-suction-thermometer': 'Suction cup thermometer',
};

function getImagesFromFolder(folderPath: string): string[] {
    try {
        if (!fs.existsSync(folderPath)) return [];
        return fs.readdirSync(folderPath).filter(f =>
            IMAGE_EXTENSIONS.includes(path.extname(f).toLowerCase())
        );
    } catch {
        return [];
    }
}

async function main() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     FIX HOUYI PRODUCT IMAGES - إصلاح صور منتجات Houyi     ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    let matched = 0;
    let notFound = 0;

    for (const [slug, folderName] of Object.entries(HOUYI_MAPPING)) {
        const srcFolder = path.join(HOUYI_FOLDER, folderName);

        if (!fs.existsSync(srcFolder)) {
            console.log(`⚠️  Folder not found: ${folderName}`);
            notFound++;
            continue;
        }

        const images = getImagesFromFolder(srcFolder);
        if (images.length === 0) {
            console.log(`⚠️  No images in: ${folderName}`);
            continue;
        }

        // Create destination folder
        const destFolder = path.join(PUBLIC_IMAGES, slug);
        if (!fs.existsSync(destFolder)) {
            fs.mkdirSync(destFolder, { recursive: true });
        }

        // Copy images (max 6)
        const webPaths: string[] = [];
        for (const img of images.slice(0, 6)) {
            fs.copyFileSync(path.join(srcFolder, img), path.join(destFolder, img));
            webPaths.push(`/images/products/houyi/${slug}/${img}`);
        }

        // Update database
        await sql`
      UPDATE products
      SET thumbnail = ${webPaths[0]},
          images = ${JSON.stringify(webPaths)}::jsonb,
          updated_at = NOW()
      WHERE slug = ${slug}
    `;

        console.log(`✅ ${slug} → ${folderName} (${webPaths.length} images)`);
        matched++;
    }

    console.log('\n════════════════════════════════════════════════════════════');
    console.log(`✅ Matched: ${matched}`);
    console.log(`⚠️  Folders not found: ${notFound}`);
}

main().catch(console.error);
