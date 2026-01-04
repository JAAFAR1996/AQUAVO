import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

const SOURCE_PATH = 'C:/Users/jaafa/Desktop/upload/FishWebClean/yee';
const DEST_PATH = 'C:/Users/jaafa/Desktop/upload/FishWebClean/client/public/images/products/yee';

// Use similar product images for products without their own images
const SIMILAR_IMAGES: { [slug: string]: { useFolder: string; destFolder: string } } = {
  // Use shelled eggs 140g images for 80g version
  'yyy-078': { useFolder: 'New Shelled Eggs (140g 200ml) White Bottle + Feeder', destFolder: 'shelled-eggs-80g' },
  // Use brine shrimp for shrimp food
  'c1-1066': { useFolder: 'Yee Aquarium Freeze-dried Brine Shrimp Chunks 18g 225ml', destFolder: 'shrimp-food' },
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
    return files.filter(f => /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(f)).slice(0, 6);
  } catch {
    return [];
  }
}

async function main() {
  console.log('=== FIXING FINAL IMAGES WITH SIMILAR PRODUCTS ===\n');

  // First, fix products that can use similar images
  for (const [slug, config] of Object.entries(SIMILAR_IMAGES)) {
    const srcPath = path.join(SOURCE_PATH, config.useFolder);
    const destPath = path.join(DEST_PATH, config.destFolder);

    if (copyFolderSync(srcPath, destPath)) {
      const imageFiles = getImagesFromFolder(destPath);
      if (imageFiles.length > 0) {
        const images = imageFiles.map(f => `/images/products/yee/${config.destFolder}/${f}`);
        const result = await sql`
          UPDATE products SET images = ${JSON.stringify(images)}::jsonb, thumbnail = ${images[0]}
          WHERE slug = ${slug} RETURNING id
        `;
        if (result.length > 0) {
          console.log(`✓ ${slug} -> using ${config.destFolder} (${imageFiles.length} images)`);
        }
      }
    }
  }

  // For remaining products, use a generic YEE placeholder
  // These products don't have matching images in the yee folder
  const remainingProducts = [
    'c1-1127', // علف ذهبية رانشو بالسبيرولينا
    'c1-1134', // علف ذهبية رانشو غارق
    'c1-1069', // عبوة عينات أعلاف متنوعة
    'cls-107', // فرشاة مغناطيسية
    'led-318', // إضاءة LED
    'yee-3656', // أنبوب بلاستيكي
    'yyh-006', // مسحوق مضاد للبكتيريا
  ];

  // Check if there's a generic YEE logo or placeholder we can use
  const genericPlaceholder = '/images/products/yee-placeholder.jpg';

  console.log('\n=== PRODUCTS THAT NEED MANUAL IMAGE UPLOAD ===');
  for (const slug of remainingProducts) {
    const product = await sql`SELECT name FROM products WHERE slug = ${slug}`;
    if (product.length > 0) {
      console.log(`  📷 ${slug}: ${product[0].name}`);
    }
  }

  // Final summary
  console.log('\n=== FINAL STATUS ===');
  const withImages = await sql`
    SELECT COUNT(*) as count FROM products
    WHERE (brand ILIKE '%yee%' OR slug LIKE 'c1-%' OR slug LIKE 'c2-%'
           OR slug LIKE 'yee-%' OR slug LIKE 'yyh-%')
      AND thumbnail IS NOT NULL
      AND thumbnail NOT LIKE '%placeholder%'
      AND thumbnail != ''
  `;

  const total = await sql`
    SELECT COUNT(*) as count FROM products
    WHERE brand ILIKE '%yee%' OR slug LIKE 'c1-%' OR slug LIKE 'c2-%'
           OR slug LIKE 'yee-%' OR slug LIKE 'yyh-%'
  `;

  console.log(`Products with images: ${withImages[0].count}/${total[0].count}`);
}

main().catch(console.error);
