import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

const SOURCE_PATH = 'C:/Users/jaafa/Desktop/upload/FishWebClean/yee';
const DEST_PATH = 'C:/Users/jaafa/Desktop/upload/FishWebClean/client/public/images/products/yee';

// Simple slug-to-folder mapping with clean folder names
const PRODUCT_IMAGES: { [slug: string]: { sourceFolder: string; destFolder: string } } = {
  // Merged variant products
  'yee-steel-heater': { sourceFolder: '50W  & 100W&  200Wpure steel heating rod YSH-50', destFolder: 'steel-heater' },
  'yee-water-grass-mud': { sourceFolder: 'Water grass mud fertility upgrade fine grain 1.5L & 3L', destFolder: 'water-grass-mud' },
  'yee-air-tube-reinforced': { sourceFolder: '【Thickened airbag for durability】1.7 meters & 1.5 metersthickened and lengthened', destFolder: 'air-tube' },
  'yee-anti-stress-water-stabilizer': { sourceFolder: 'Anti-stress water stabilizer 500ml New style', destFolder: 'anti-stress-stabilizer' },
  'yee-glass-tank': { sourceFolder: '35×35×35 6mm thick & 40X40X40cm 6mm thick & 604040cm 8mm & 400x230x250mm 5mm thick & 500x270x300mm 5mm thick & 600x300x350mm 5mm thick', destFolder: 'glass-tank' },

  // Foods
  'c1-1113': { sourceFolder: 'Yee Small Fish Feed All-in-One 0.6mm 75g', destFolder: 'small-fish-feed' },
  'c1-1127': { sourceFolder: 'Goldfish Orchid Longevity Jade Fungus + Spirulina Color Yang Compound Feed 290g Slow Sinking 3.0mm', destFolder: 'goldfish-spirulina-feed' },
  'c1-1073': { sourceFolder: 'Betta fish food 0.8mm 130g New', destFolder: 'betta-food' },
  'c1-1082': { sourceFolder: 'Imitation red worm feed 0.5mm 115g', destFolder: 'red-worm-feed' },
  'c1-1065': { sourceFolder: 'Floating Grain - Competition Grade 45% High Protein [1.5mm Small Particles] 300g Bag', destFolder: 'high-protein-feed' },
  'c1-1086': { sourceFolder: 'Yee Aquarium Freeze-dried Brine Shrimp Chunks 18g 225ml', destFolder: 'brine-shrimp' },
  'c1-1124': { sourceFolder: 'Yee Brand 3-in-1 Betta Fish Food 15g', destFolder: 'betta-3in1' },
  'c1-1125': { sourceFolder: 'Yee Aqua-Hermit Crab Freeze-Dried Feast 55g', destFolder: 'hermit-crab-food' },
  'yee-all-in-onemicroparticles02mm210g': { sourceFolder: '【All-in-one】Microparticles0.2mm210g', destFolder: 'microparticles' },
  'yee-new-shelled-eggs-140g-200ml-white-bottle-feeder': { sourceFolder: 'New Shelled Eggs (140g 200ml) White Bottle + Feeder', destFolder: 'shelled-eggs-140g' },

  // Treatments
  'yyh-125': { sourceFolder: 'White Spot Cleaner 300ml', destFolder: 'white-spot-cleaner' },
  'yyh-207': { sourceFolder: 'Methylene blue solution 600ml', destFolder: 'methylene-blue-600ml' },
  'c2-1016': { sourceFolder: 'Yee Aquarium Cleansing Ammonia Series Active Probiotics 760ml', destFolder: 'ammonia-probiotics' },
  'yyh-039': { sourceFolder: 'Yee Blue Classic-Chlorine Removal Water Stabilizer 535ml', destFolder: 'chlorine-removal' },
  'yyh-189': { sourceFolder: 'Algaecide 500ml New Style', destFolder: 'algaecide' },
  'yyh-053': { sourceFolder: 'Yee Blue Classic-Methylene Blue Solution 235ml', destFolder: 'methylene-blue-235ml' },
  'c2-1005': { sourceFolder: 'Yee Aquarium Nitrifying Bacteria + Probiotics Capsules 50 capsules', destFolder: 'nitrifying-bacteria' },
  'yan-804': { sourceFolder: 'Multivitamin mineral salt 500g', destFolder: 'mineral-salt' },
  'yan-915': { sourceFolder: '500G Multivitamin Salt Box YAN-915', destFolder: 'multivitamin-salt-box' },
  'pyd-200': { sourceFolder: 'Fish tank descaling agent 200ml', destFolder: 'descaling-agent' },

  // Testing
  'c3-1010': { sourceFolder: '【Ammonia nitrogen tester】can test about 60 timesaccurate and fast & 【Nitrite test kit】can test about 100 timesaccurate and fast', destFolder: 'ammonia-nitrite-test' },
  'c4-1123': { sourceFolder: '[Novice Level 50] 9-in-1BucketWith Comparison Chart', destFolder: '9in1-test-kit' },
  'yee-refill9-in-1refill50-pieces': { sourceFolder: '【Refill】9 in 1Refill50 pieces', destFolder: '9in1-refill' },

  // Heaters
  'c4-1432': { sourceFolder: 'Yee brand aquarium quartz heating rod, 100W', destFolder: 'quartz-heater' },
  'c4-1103': { sourceFolder: 'YEE Black Warrior Heater 100W', destFolder: 'black-warrior-heater' },

  // Substrate & Decor
  'yff-042': { sourceFolder: 'Nano Culture Ring Mixed Pack', destFolder: 'nano-culture-ring' },
  'yaa-009': { sourceFolder: 'High energy culture bricks', destFolder: 'culture-bricks' },
  'nyh-006': { sourceFolder: '3D filter material', destFolder: '3d-filter' },
  'ylc-410': { sourceFolder: '16-in-1 filter material 2.5kg', destFolder: '16in1-filter' },
  'ylc-409': { sourceFolder: 'Six-in-one filter material 500g', destFolder: '6in1-filter' },

  // Equipment
  'ytz-300': { sourceFolder: 'Xiaobai single-hole oxygen pump 3W (non-adjustable) YTZ-300', destFolder: 'oxygen-pump' },
  'ygg-135': { sourceFolder: 'YEE 50mm Ball Mineral Bubble Diffuser', destFolder: 'bubble-diffuser' },
  'c4-1117': { sourceFolder: 'High configuration 30W low water level', destFolder: 'sand-cleaner' },
  'c4-1008': { sourceFolder: 'Large suspended isolation box', destFolder: 'isolation-box' },
  'ysl-506': { sourceFolder: 'Large pneumatic incubator (double room)', destFolder: 'pneumatic-incubator' },
  'ykl-018': { sourceFolder: 'Acrylic incubator 201010', destFolder: 'acrylic-incubator' },
  'yll-087': { sourceFolder: '(Blue) New upgraded 6D filter cotton 5040 two pieces', destFolder: '6d-filter-cotton' },
  'c4-1067': { sourceFolder: '3W oil film processor', destFolder: 'oil-film-processor' },
  'yee-3606': { sourceFolder: 'External electronic thermometer', destFolder: 'thermometer' },
};

function copyFolderSync(src: string, dest: string) {
  if (!fs.existsSync(src)) return false;

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const files = fs.readdirSync(src);
  for (const file of files) {
    const srcFile = path.join(src, file);
    const destFile = path.join(dest, file);

    if (fs.statSync(srcFile).isFile()) {
      fs.copyFileSync(srcFile, destFile);
    }
  }
  return true;
}

function getImagesFromFolder(folderPath: string): string[] {
  try {
    if (!fs.existsSync(folderPath)) return [];
    const files = fs.readdirSync(folderPath);
    return files
      .filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f))
      .slice(0, 6);
  } catch {
    return [];
  }
}

async function main() {
  console.log('=== FIXING YEE PRODUCT IMAGES ===\n');

  let copied = 0;
  let updated = 0;
  let errors: string[] = [];

  for (const [slug, config] of Object.entries(PRODUCT_IMAGES)) {
    const srcPath = path.join(SOURCE_PATH, config.sourceFolder);
    const destPath = path.join(DEST_PATH, config.destFolder);

    // Copy images to clean folder
    if (copyFolderSync(srcPath, destPath)) {
      copied++;

      // Get image files
      const imageFiles = getImagesFromFolder(destPath);

      if (imageFiles.length > 0) {
        const images = imageFiles.map(f => `/images/products/yee/${config.destFolder}/${f}`);

        try {
          const result = await sql`
            UPDATE products
            SET
              images = ${JSON.stringify(images)}::jsonb,
              thumbnail = ${images[0]}
            WHERE slug = ${slug}
            RETURNING id, name
          `;

          if (result.length > 0) {
            console.log(`✓ ${slug} -> ${config.destFolder} (${imageFiles.length} images)`);
            updated++;
          } else {
            console.log(`⚠ Not found in DB: ${slug}`);
          }
        } catch (error: any) {
          console.log(`✗ DB Error: ${slug} - ${error.message}`);
          errors.push(slug);
        }
      } else {
        console.log(`⚠ No images in source: ${slug}`);
      }
    } else {
      console.log(`⚠ Source folder not found: ${config.sourceFolder.substring(0, 40)}...`);
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Folders copied: ${copied}`);
  console.log(`Products updated: ${updated}`);
  console.log(`Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log(`Failed slugs: ${errors.join(', ')}`);
  }
}

main().catch(console.error);
