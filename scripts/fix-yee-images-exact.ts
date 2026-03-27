import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');
const basePath = 'C:\\Users\\jaafa\\Desktop\\upload\\FishWebClean\\client\\public\\images\\products\\yee';

const codeToFolder: Record<string, string> = {
  '1.5.1.7': 'YEE-3006',
  '1.5.1.8': 'YEE-3006',
  '1.5.1.9': 'YEE-3006',
  'C4-1432-1': 'yee-c4-1432',
  'C4-1103-4': 'yee-c4-1103',
  '03326': 'yee-ytz-300',
  '07154': 'yee-ygg-135',
  'C5-1144-1a': 'yee-reinforced-tube',
  '1.8.3.2': 'YEE-3621',
  'C4-1117-1': 'yee-c4-1117',
  'C4-1008-1': 'yee-c4-1008',
  '02517': 'yee-ysl-506',
  '02771': 'yee-acrylic-incubator-201010',
  '05617a': 'yee-blue-new-upgraded-6d-filter-cotton-5040-two-pieces',
  '07116': 'yee-yff-042',
  '17699a': 'yee-high-energy-culture-bricks',
  '11578': 'yee-nyh-006',
  '71934': 'yee-ylc-410',
  '17831': 'yee-ylc-409',
  'C4-1067-1': 'yee-c4-1067',
  '08116': 'yee-led-318-light',
  '07140': 'yee-cls-107-magnetic-brush',
  '1.15.60': 'yee-reinforced-tube', 
  '06255': 'YEE Ultra-Clear Glass Tank',
  '05380': 'YEE Ultra-Clear Glass Tank',
  '05381': 'YEE Ultra-Clear Glass Tank',
  '16932': 'YEE Ultra-Clear Glass Tank',
  '05662': 'YEE Ultra-Clear Glass Tank',
  'C5-1062-1': 'YEE Ultra-Clear Glass Tank',
  'C5-1123-2': 'yee-tank-601515',
  'C1-1113-2': 'yee-c1-1113',
  'C1-1127-1': 'yee-c1-1127-ranchu-feed',
  'C1-1073-1a': 'yee-c1-1073',
  'C1-1082-5': 'yee-c1-1082-5',
  'C1-1065-1': 'yee-c1-1065',
  'C1-1066-2': 'yee-c1-1066-shrimp-food',
  '03446a': 'yee-new-shelled-eggs-140g-200ml-white-bottle-feeder',
  'C1-1125-1': 'yee-c1-1125',
  'C1-1069-1': 'yee-c1-1069-sample-pack',
  'C1-1082-2a': 'yee-c1-1082-2a',
  'C1-1134-6': 'yee-c1-1134-ranchu-sinking',
  'C1-1086-1': 'yee-c1-1086',
  'C1-1124-1': 'yee-c1-1124',
  '12420': 'yee-yyh-125',
  '19768a': 'yee-yyh-207',
  '02856a': 'yee-yyh-006-antibacterial',
  'c2-1016-2': 'yee-c2-1016',
  'c2-1016-1a': 'yee-c2-1016',
  '02924': 'yee-yyh-039',
  '16940': 'yee-yyh-173',
  'C3-1010-3': 'yee-c3-1010',
  'C3-1010-1': 'yee-c3-1010',
  'C4-1123-1a': 'yee-c4-1123-1a',
  'C2-1005-1': 'yee-c2-1005',
  'C2-1005-2': 'yee-c2-1005',
  '19429': 'yee-yyh-189',
  '19939': 'yee-yyh-173', 
  '06834': 'yee-yan-804',
  '01831': 'yee-yan-915',
  '02938a': 'yee-yyh-053',
  'C4-1123-2a': 'yee-c4-1123-2a',
  '07509': 'yee-yff-049',
  '07512': 'yee-yff-049',
  '13343': 'yee-pyd-200',
  '00340': 'yee-yee-3606'
};

const slugToCodes: Record<string, string[]> = {
  '1-5-1-7': ['1.5.1.7', '1.5.1.8', '1.5.1.9'],
  '06255': ['06255', '05380', '05381', '16932', '05662', 'C5-1062-1'],
  'c1-1082-5': ['C1-1082-5', 'C1-1082-2a'],
  'c2-1016-2': ['c2-1016-2', 'c2-1016-1a'],
  'c2-1005-1': ['C2-1005-1', 'C2-1005-2'],
  'c3-1010-3': ['C3-1010-3', 'C3-1010-1'],
  'c4-1123-1a': ['C4-1123-1a', 'C4-1123-2a'],
  '07509': ['07509', '07512'],
  'c5-1144-1a': ['C5-1144-1a', '1.8.3.2'],
};

function getImagesForFolder(folderName: string): string[] {
  try {
    const dir = path.join(basePath, folderName);
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      return files
        .filter(f => f.match(/\.(jpg|jpeg|png|webp|gif)$/i))
        .map(f => `/images/products/yee/${folderName}/${f}`);
    }
  } catch (e) {
    // Ignore error
  }
  return [];
}

async function main() {
  console.log("=== FIXING EXACT IMAGES ===");
  
  const products = await sql`SELECT id, slug, name FROM products WHERE brand = 'YEE'`;
  let fixedCount = 0;

  for (const product of products) {
    // Determine which original codes belong to this product
    let codes = slugToCodes[product.slug];
    if (!codes) {
      // If not a merged product, try to find the code case insensitively
      const originalCode = Object.keys(codeToFolder).find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === product.slug.replace(/-/g, ''));
      codes = originalCode ? [originalCode] : [];
    }

    if (codes.length > 0) {
      // Gather images from all matched folders
      const allImages: string[] = [];
      const usedFolders = new Set<string>();
      
      for (const code of codes) {
        const folder = codeToFolder[code];
        if (folder && !usedFolders.has(folder)) {
          usedFolders.add(folder);
          const images = getImagesForFolder(folder);
          allImages.push(...images);
        }
      }

      // Deduplicate images
      const dedupedImages = [...new Set(allImages)];
      
      if (dedupedImages.length > 0) {
        await sql`
          UPDATE products 
          SET images = ${JSON.stringify(dedupedImages)}::jsonb
          WHERE id = ${product.id}
        `;
        console.log(`✅ ${product.slug} -> Found ${dedupedImages.length} images (Folders: ${[...usedFolders].join(', ')})`);
        fixedCount++;
      } else {
        console.log(`❌ ${product.slug} -> No images found (Codes: ${codes.join(', ')})`);
      }
    } else {
      console.log(`⚠ ${product.slug} -> No matching code map found, keeping existing images.`);
    }
  }

  console.log(`\n🎉 Corrected images for ${fixedCount} products based on EXACT Excel mappings.`);
}

main().catch(console.error);
