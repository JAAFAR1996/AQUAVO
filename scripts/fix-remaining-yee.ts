/**
 * Script to fix remaining YEE products without image matches
 * Run with: npx tsx scripts/fix-remaining-yee.ts
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

const YEE_FOLDER = './client/public/images/products/yee';

// Direct mapping for remaining products
const remainingProducts: Record<string, { model: string; slug: string }> = {
  'yee-c1-1066-shrimp-food': { model: 'C1-1066', slug: 'yee-c1-1066' },
  'yee-yyh-006-antibacterial': { model: 'YYH-006', slug: 'yee-yyh-006' },
  'yee-c1-1134-ranchu-sinking': { model: 'C1-1134', slug: 'yee-c1-1134' },
  'yee-c1-1127-ranchu-feed': { model: 'C1-1127', slug: 'yee-c1-1127' },
  'yee-c1-1069-sample-pack': { model: 'C1-1069', slug: 'yee-c1-1069' },
  'yee-3656-tubing': { model: 'YEE-3656', slug: 'yee-3656' },
  'yee-cls-107-magnetic-brush': { model: 'CLS-107', slug: 'yee-cls-107' },
  'yee-led-318-light': { model: 'LED-318', slug: 'yee-led-318' },
  'yee-air-tube-reinforced': { model: 'C5-1144', slug: 'yee-c5-1144' },
  'yee-anti-stress-water-stabilizer': { model: 'YYH-173', slug: 'yee-yyh-173' },
  'yee-steel-heater': { model: 'YEE-3006', slug: 'yee-steel-heater' },
  'yee-new-shelled-eggs-140g-200ml-white-bottle-feeder': { model: 'YYY-078', slug: 'yee-yyy-078-shelled-eggs' },
  'yee-novice-level-50-9-in-1bucketwith-comparison-chart': { model: 'C4-1123-1a', slug: 'yee-c4-1123-1a' },
  'yee-all-in-onemicroparticles02mm210g': { model: 'C1-1082-2a', slug: 'yee-c1-1082-2a' },
  'yee-refill9-in-1refill50-pieces': { model: 'C4-1123-2a', slug: 'yee-c4-1123-2a' },
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
  console.log('=== Fixing Remaining YEE Products ===\n');

  let updated = 0;
  const noImages: string[] = [];

  for (const [productId, mapping] of Object.entries(remainingProducts)) {
    const images = getImagesFromFolder(mapping.model);

    if (images.length > 0) {
      await db.execute(sql`
        UPDATE products 
        SET slug = ${mapping.slug},
            images = ${JSON.stringify(images)}::jsonb,
            thumbnail = ${images[0]},
            updated_at = NOW()
        WHERE id = ${productId}
      `);

      console.log(`✅ ${productId} -> ${mapping.slug} (${images.length} images)`);
      updated++;
    } else {
      console.log(`⚠️ ${productId} - No images in ${mapping.model}`);
      noImages.push(`${productId} -> ${mapping.model}`);
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Updated: ${updated}`);
  console.log(`Missing images: ${noImages.length}`);

  if (noImages.length > 0) {
    console.log(`\nProducts needing images:`);
    noImages.forEach(p => console.log(`  - ${p}`));
  }

  await pool.end();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
