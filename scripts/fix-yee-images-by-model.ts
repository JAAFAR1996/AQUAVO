import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');
const basePath = 'C:\\Users\\jaafa\\Desktop\\upload\\FishWebClean\\client\\public\\images\\products\\yee';

// ===================================================================
// DIRECT Slug → Image Folder Mapping
// Maps the actual database slug to the correct image folder
// ===================================================================
const slugToFolder: Record<string, string> = {
  // --- HEATERS & TEMPERATURE ---
  'yee-3006': 'YEE-3006',                    // 50W/100W/200W Stainless Steel Heater
  'c4-1432': 'yee-c4-1432',                  // Quartz Heater 100W
  'c4-1103': 'yee-c4-1103',                  // Black Warrior Heater
  'c4-1117': 'yee-c4-1117',                  // Low Water Level Heater 30W
  'yee-3606': 'yee-yee-3606',                // Digital Thermometer

  // --- AIR & CO2 ---
  'ytz-300': 'yee-ytz-300',                  // Single Hole Air Pump 3W
  'ygg-135': 'yee-ygg-135',                  // 50mm Mineral CO2 Diffuser

  // --- TUBES & HOSES ---
  'c5-1144': 'yee-reinforced-tube',           // Reinforced Tube 1.5m
  'yee-3621': 'YEE-3621',                    // Air Hose 1.7m
  'yee-3656': 'yee-reinforced-tube',          // 16mm Hose 1.0m

  // --- BREEDING & ISOLATION ---
  'c4-1008': 'yee-c4-1008',                  // Floating Isolation Box
  'ysl-506': 'yee-ysl-506',                  // Air-Driven Hatching Box
  'ykl-018': 'yee-acrylic-incubator-201010',  // Acrylic Incubator 20x10x10

  // --- FILTRATION & MEDIA ---
  'yll-087': 'yee-blue-new-upgraded-6d-filter-cotton-5040-two-pieces', // 6D Filter Cotton
  'yff-042': 'yee-yff-042',                  // Nano Culture Rings
  'yaa-009': 'yee-high-energy-culture-bricks', // High Energy Culture Bricks
  'nyh-006': 'yee-nyh-006',                  // 3D Cookie Filter Media 500g
  'ylc-410': 'yee-ylc-410',                  // 16-in-1 Filter Media 2.5kg
  'ylc-409': 'yee-ylc-409',                  // 6-in-1 Filter Media 500g
  'c4-1067': 'yee-c4-1067',                  // Oil Skimmer 3W

  // --- LIGHTING ---
  'led-318': 'yee-led-318-light',             // LED 3-Color Adjustable Light 27cm

  // --- CLEANING ---
  'cls-107': 'yee-cls-107-magnetic-brush',    // Magnetic Brush Large Blue
  'pyd-200': 'yee-pyd-200',                  // Tank Descaler 200ml

  // --- TANKS ---
  'yxl-003': 'YEE Ultra-Clear Glass Tank',    // 400x230x250mm
  'ykk-50': 'YEE Ultra-Clear Glass Tank',     // 500x270x300mm
  'ykk-60': 'YEE Ultra-Clear Glass Tank',     // 600x300x350mm
  'yee-1090': 'YEE Ultra-Clear Glass Tank',   // 35x35x35
  'ycg-40': 'YEE Ultra-Clear Glass Tank',     // 40x40x40
  'c5-1062': 'YEE Ultra-Clear Glass Tank',    // 60x40x40
  'c5-1123': 'yee-tank-601515',              // Stream Tank 60x15x15

  // --- FISH FOOD ---
  'c1-1113': 'yee-c1-1113',                  // Small Fish Feed 0.6mm 75g
  'c1-1127': 'yee-c1-1127-ranchu-feed',       // Ranchu Feed 290g
  'c1-1073': 'yee-c1-1073',                  // Betta Feed 0.8mm 130g
  'c1-1082': 'yee-c1-1082-5',                // Red Worm Imitation Feed
  'c1-1065': 'yee-c1-1065',                  // Butterfly Koi Feed 1.5mm 300g
  'c1-1066': 'yee-c1-1066-shrimp-food',       // Shrimp Food 260g
  'yyy-078': 'yee-yyy-078-brine-shrimp-eggs',  // Brine Shrimp Eggs 80g
  'c1-1125': 'yee-c1-1125',                  // Hermit Crab Feast 55g
  'c1-1069': 'yee-c1-1069-sample-pack',       // Fish Food Sample Pack
  'c1-1134': 'yee-c1-1134-ranchu-sinking',    // Ranchu Sinking Feed 500g
  'c1-1086': 'yee-c1-1086',                  // Freeze-Dried Brine Shrimp 18g
  'c1-1124': 'yee-c1-1124',                  // 3-in-1 Betta Feed 15g

  // --- WATER TREATMENT ---
  'yyh-125': 'yee-yyh-125',                  // White Spot Treatment 300ml
  'yyh-207': 'yee-yyh-207',                  // Methylene Blue Solution 600ml
  'yyh-006': 'yee-yyh-006-antibacterial',     // Antibacterial Powder
  'c2-1016': 'yee-c2-1016',                  // Active Probiotics 400ml/760ml
  'yyh-039': 'yee-yyh-039',                  // Dechlorinator 535ml
  'yyh-173': 'yee-yyh-173',                  // Anti-Stress Water Stabilizer 500ml
  'yyh-216': 'yee-yyh-173',                  // Anti-Stress Water Stabilizer 1000ml (same product line)
  'c2-1005': 'yee-c2-1005',                  // Nitrifying+Probiotic Capsules 50/100
  'yyh-189': 'yee-yyh-189',                  // Algae Remover 500ml
  'yyh-053': 'yee-yyh-053',                  // Methylene Blue Classic 235ml

  // --- TEST KITS ---
  'c3-1010': 'yee-c3-1010',                  // Ammonia/Nitrite Test Kit
  'c4-1123': 'yee-c4-1123-1a',               // 9-in-1 Test Strips Bucket
  'c4-1123-refill': 'yee-c4-1123-2a',        // 9-in-1 Test Strips Refill

  // --- SUBSTRATE ---
  'yff-049': 'yee-yff-049',                  // Aquatic Soil Fine 1.5L
  'yff-052': 'yee-yff-049',                  // Aquatic Soil Coarse 3L (same product line)

  // --- SALT & MINERALS ---
  'yan-804': 'yee-yan-804',                  // Multi-Vitamin Salt 500g
  'yan-915': 'yee-yan-915',                  // Multi-Vitamin Salt Boxed 500g
};

function getImagesForFolder(folderName: string): string[] {
  try {
    const dir = path.join(basePath, folderName);
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      return files
        .filter(f => f.match(/\.(jpg|jpeg|png|webp|gif|avif)$/i))
        .sort()
        .map(f => `/images/products/yee/${folderName}/${f}`);
    }
  } catch (e) { /* ignore */ }
  return [];
}

async function main() {
  console.log("=== FIX YEE IMAGES BY MODEL (SLUG MAPPING) ===\n");

  const products = await sql`SELECT id, slug, name, images, thumbnail FROM products WHERE brand = 'YEE' AND deleted_at IS NULL ORDER BY slug`;
  console.log(`Found ${products.length} YEE products in database\n`);

  let fixedCount = 0;
  let unchangedCount = 0;
  let skippedCount = 0;
  let emptyCount = 0;
  const changes: { slug: string; oldFolder: string; newFolder: string; imageCount: number }[] = [];

  for (const product of products) {
    const slug = product.slug;
    const correctFolder = slugToFolder[slug];

    if (!correctFolder) {
      console.log(`⚠ SKIP: ${slug} → No mapping defined`);
      skippedCount++;
      continue;
    }

    const newImages = getImagesForFolder(correctFolder);

    if (newImages.length === 0) {
      console.log(`❌ EMPTY: ${slug} → Folder "${correctFolder}" has no images`);
      emptyCount++;
      continue;
    }

    // Detect current folder from existing images
    const currentImages = Array.isArray(product.images) ? product.images : [];
    const currentFolderMatch = (currentImages[0] || '').match(/\/images\/products\/yee\/([^/]+)\//);
    const currentFolder = currentFolderMatch ? currentFolderMatch[1] : 'none';
    const isChanged = currentFolder !== correctFolder;

    // Always update to ensure consistency
    const thumbnail = newImages[0];
    await sql`
      UPDATE products 
      SET images = ${JSON.stringify(newImages)}::jsonb,
          thumbnail = ${thumbnail},
          updated_at = NOW()
      WHERE id = ${product.id}
    `;

    if (isChanged) {
      console.log(`🔄 FIXED: ${slug}`);
      console.log(`   Old: ${currentFolder}`);
      console.log(`   New: ${correctFolder} (${newImages.length} images)`);
      changes.push({ slug, oldFolder: currentFolder, newFolder: correctFolder, imageCount: newImages.length });
      fixedCount++;
    } else {
      console.log(`✅ OK: ${slug} → ${correctFolder} (${newImages.length} images)`);
      unchangedCount++;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Summary:`);
  console.log(`   🔄 Fixed (changed): ${fixedCount}`);
  console.log(`   ✅ Already correct: ${unchangedCount}`);
  console.log(`   ⚠  No mapping: ${skippedCount}`);
  console.log(`   ❌ Empty folders: ${emptyCount}`);

  if (changes.length > 0) {
    console.log(`\n🔄 Products that were CORRECTED:`);
    for (const c of changes) {
      console.log(`   ${c.slug}: "${c.oldFolder}" → "${c.newFolder}" (${c.imageCount} imgs)`);
    }
  }

  console.log(`\n🎉 Done!`);
}

main().catch(console.error);
