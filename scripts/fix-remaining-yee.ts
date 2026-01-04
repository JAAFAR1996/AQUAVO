import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

const YEE_SOURCE = 'C:/Users/jaafa/Desktop/upload/FishWebClean/yee';
const YEE_DEST = 'C:/Users/jaafa/Desktop/upload/FishWebClean/client/public/images/products/yee';

// Manual mapping for products not in Excel (merged variants and custom products)
const MANUAL_MAPPING: { [slug: string]: string } = {
  // Merged variant products
  'yee-steel-heater': '50W  & 100W&  200Wpure steel heating rod YSH-50',
  'yee-water-grass-mud': 'Water grass mud fertility upgrade fine grain 1.5L & 3L',
  'yee-air-tube-reinforced': '【Thickened airbag for durability】1.7 meters & 1.5 metersthickened and lengthened',
  'yee-anti-stress-water-stabilizer': 'Anti-stress water stabilizer 500ml New style',
  'yee-glass-tank': '35×35×35 6mm thick & 40X40X40cm 6mm thick & 604040cm 8mm & 400x230x250mm 5mm thick & 500x270x300mm 5mm thick & 600x300x350mm 5mm thick',

  // Products with custom slugs
  'yee-all-in-onemicroparticles02mm210g': '【All-in-one】Microparticles0.2mm210g',
  'yee-new-shelled-eggs-140g-200ml-white-bottle-feeder': 'New Shelled Eggs (140g 200ml) White Bottle + Feeder',
  'yee-refill9-in-1refill50-pieces': '【Refill】9 in 1Refill50 pieces',
  'yaa-009': 'High energy culture bricks',

  // Products that need closest match
  'c1-1127': 'Goldfish Orchid Longevity Jade Fungus + Spirulina Color Yang Compound Feed 290g Slow Sinking 3.0mm',
  'yyh-006': 'Yee Aquarium Nitrifying Bacteria + Probiotics Capsules 50 capsules', // Use similar
  'yyh-173': 'Anti-stress water stabilizer 500ml New style',
  'yyh-216': 'Anti-stress water stabilizer 1000ml New style',
  'yff-049': 'Water grass mud fertility upgrade fine grain 1.5L & 3L',
  'yff-052': 'Water grass mud fertility upgrade fine grain 1.5L & 3L',
  'yee-3006': '50W  & 100W&  200Wpure steel heating rod YSH-50',
  'yee-3007': '50W  & 100W&  200Wpure steel heating rod YSH-50',
  'yee-3008': '50W  & 100W&  200Wpure steel heating rod YSH-50',
  'c5-1144': '【Thickened airbag for durability】1.7 meters & 1.5 metersthickened and lengthened',
  'yee-3621': '【Thickened airbag for durability】1.7 meters & 1.5 metersthickened and lengthened',
  'yee-1090': '35×35×35 6mm thick & 40X40X40cm 6mm thick & 604040cm 8mm & 400x230x250mm 5mm thick & 500x270x300mm 5mm thick & 600x300x350mm 5mm thick',
  'ycg-40': '35×35×35 6mm thick & 40X40X40cm 6mm thick & 604040cm 8mm & 400x230x250mm 5mm thick & 500x270x300mm 5mm thick & 600x300x350mm 5mm thick',
  'yxl-003': '35×35×35 6mm thick & 40X40X40cm 6mm thick & 604040cm 8mm & 400x230x250mm 5mm thick & 500x270x300mm 5mm thick & 600x300x350mm 5mm thick',
  'ykk-50': '35×35×35 6mm thick & 40X40X40cm 6mm thick & 604040cm 8mm & 400x230x250mm 5mm thick & 500x270x300mm 5mm thick & 600x300x350mm 5mm thick',
  'ykk-60': '35×35×35 6mm thick & 40X40X40cm 6mm thick & 604040cm 8mm & 400x230x250mm 5mm thick & 500x270x300mm 5mm thick & 600x300x350mm 5mm thick',
  'c5-1062': '35×35×35 6mm thick & 40X40X40cm 6mm thick & 604040cm 8mm & 400x230x250mm 5mm thick & 500x270x300mm 5mm thick & 600x300x350mm 5mm thick',
};

function copyFolder(src: string, destName: string): boolean {
  const srcPath = path.join(YEE_SOURCE, src);
  const destPath = path.join(YEE_DEST, destName);

  if (!fs.existsSync(srcPath)) {
    console.log(`  Source not found: ${src}`);
    return false;
  }

  if (!fs.existsSync(destPath)) {
    fs.mkdirSync(destPath, { recursive: true });
  }

  const files = fs.readdirSync(srcPath);
  for (const file of files) {
    const srcFile = path.join(srcPath, file);
    const destFile = path.join(destPath, file);
    if (fs.statSync(srcFile).isFile()) {
      fs.copyFileSync(srcFile, destFile);
    }
  }
  return true;
}

function getImages(folderName: string): string[] {
  const folderPath = path.join(YEE_DEST, folderName);
  if (!fs.existsSync(folderPath)) return [];

  return fs.readdirSync(folderPath)
    .filter(f => /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(f))
    .slice(0, 6)
    .map(f => `/images/products/yee/${folderName}/${f}`);
}

async function main() {
  console.log('=== FIXING REMAINING YEE PRODUCTS ===\n');

  let fixed = 0;

  for (const [slug, sourceFolder] of Object.entries(MANUAL_MAPPING)) {
    // Check if product exists in DB
    const product = await sql`SELECT id, name FROM products WHERE slug = ${slug}`;
    if (product.length === 0) continue;

    // Copy folder
    if (copyFolder(sourceFolder, slug)) {
      const images = getImages(slug);

      if (images.length > 0) {
        await sql`
          UPDATE products
          SET images = ${JSON.stringify(images)}::jsonb,
              thumbnail = ${images[0]}
          WHERE slug = ${slug}
        `;

        console.log(`✓ ${slug} (${images.length} images)`);
        fixed++;
      }
    }
  }

  console.log(`\n=== FIXED: ${fixed} products ===`);

  // Final check
  console.log('\n=== FINAL STATUS ===');
  const noImages = await sql`
    SELECT slug, name FROM products
    WHERE (brand ILIKE '%yee%' OR slug LIKE 'c1-%' OR slug LIKE 'c2-%'
           OR slug LIKE 'yee-%' OR slug LIKE 'yyh-%')
      AND (thumbnail IS NULL OR thumbnail LIKE '%placeholder%' OR thumbnail = '')
    ORDER BY slug
  `;

  if (noImages.length > 0) {
    console.log(`\nProducts still without images: ${noImages.length}`);
    for (const p of noImages) {
      console.log(`  - ${p.slug}: ${p.name.substring(0, 40)}`);
    }
  } else {
    console.log('\n✅ All products have images!');
  }

  // Count total
  const total = await sql`
    SELECT COUNT(*) as count FROM products
    WHERE brand ILIKE '%yee%' OR slug LIKE 'c1-%' OR slug LIKE 'c2-%'
           OR slug LIKE 'yee-%' OR slug LIKE 'yyh-%'
  `;

  const withImages = await sql`
    SELECT COUNT(*) as count FROM products
    WHERE (brand ILIKE '%yee%' OR slug LIKE 'c1-%' OR slug LIKE 'c2-%'
           OR slug LIKE 'yee-%' OR slug LIKE 'yyh-%')
      AND thumbnail IS NOT NULL
      AND thumbnail NOT LIKE '%placeholder%'
      AND thumbnail != ''
  `;

  console.log(`\nTotal: ${withImages[0].count}/${total[0].count} products with images`);
}

main().catch(console.error);
