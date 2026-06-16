import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

const SOURCE_PATH = 'C:/Users/jaafa/Desktop/upload/FishWebClean/yee';
const DEST_PATH = 'C:/Users/jaafa/Desktop/upload/FishWebClean/client/public/images/products/yee';

// Products that still need images (including avif format)
const REMAINING_PRODUCTS: { [slug: string]: { sourceFolder: string; destFolder: string } } = {
  'ylc-410': { sourceFolder: '16-in-1 filter material 2.5kg', destFolder: '16in1-filter' },
  'ykl-018': { sourceFolder: 'Acrylic incubator 201010', destFolder: 'acrylic-incubator' },
  'yee-3606': { sourceFolder: 'External electronic thermometer', destFolder: 'thermometer' },
  'c4-1103': { sourceFolder: 'YEE Black Warrior Heater 100W', destFolder: 'black-warrior-heater' },
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
    // Include avif format
    return files
      .filter(f => /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(f))
      .slice(0, 6);
  } catch {
    return [];
  }
}

async function main() {
  console.log('=== FIXING REMAINING YEE PRODUCT IMAGES ===\n');

  for (const [slug, config] of Object.entries(REMAINING_PRODUCTS)) {
    const srcPath = path.join(SOURCE_PATH, config.sourceFolder);
    const destPath = path.join(DEST_PATH, config.destFolder);

    if (copyFolderSync(srcPath, destPath)) {
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
          } else {
            console.log(`⚠ Not found in DB: ${slug}`);
          }
        } catch (error: any) {
          console.log(`✗ DB Error: ${slug} - ${error.message}`);
        }
      }
    }
  }

  // Now handle products without any available images - use placeholder
  const productsWithoutImages = [
    { slug: 'c1-1127', name: 'علف ذهبية رانشو بالسبيرولينا 290 جرام' },
    { slug: 'c1-1134', name: 'علف ذهبية رانشو غارق 500 جرام' },
    { slug: 'c1-1066', name: 'طعام روبيان الزينة عالي البروتين 260 جرام' },
    { slug: 'c1-1069', name: 'عبوة عينات أعلاف متنوعة' },
    { slug: 'cls-107', name: 'فرشاة مغناطيسية كبيرة زرقاء' },
    { slug: 'led-318', name: 'إضاءة LED ثلاثية الألوان' },
    { slug: 'yee-3656', name: 'أنبوب بلاستيكي مقوى' },
    { slug: 'yyh-006', name: 'مسحوق مضاد للبكتيريا' },
    { slug: 'yyy-078', name: 'بيض أرتيميا مقشر 80 جرام' },
  ];

  console.log('\n=== Products without available images (need manual upload) ===');
  for (const p of productsWithoutImages) {
    console.log(`  - ${p.slug}: ${p.name}`);
  }

  // Check final status
  console.log('\n=== FINAL CHECK ===');
  const noImages = await sql`
    SELECT slug, name, thumbnail
    FROM products
    WHERE (brand ILIKE '%yee%' OR slug LIKE 'c1-%' OR slug LIKE 'c2-%'
           OR slug LIKE 'yee-%' OR slug LIKE 'yyh-%' OR slug LIKE 'cls-%'
           OR slug LIKE 'led-%' OR slug LIKE 'yyy-%')
      AND (thumbnail IS NULL OR thumbnail LIKE '%placeholder%' OR thumbnail = '')
    ORDER BY slug
  `;

  console.log(`Products still without images: ${noImages.length}`);
  for (const p of noImages) {
    console.log(`  - ${p.slug}: ${p.name}`);
  }
}

main().catch(console.error);
