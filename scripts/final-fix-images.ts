import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

const DEST = 'C:/Users/jaafa/Desktop/upload/FishWebClean/client/public/images/products/yee';

// Use similar images for products without their own images
const SIMILAR: { [slug: string]: string } = {
  'c1-1069': 'c1-1113', // Feed samples -> small fish feed
  'c1-1127': 'c1-1065', // Goldfish spirulina -> high protein feed
  'yee-3656': 'yee-air-tube-reinforced', // Plastic tube -> air tube
  'cls-107': 'c4-1117' // Magnetic brush -> similar equipment
};

async function main() {
  console.log('=== FINAL FIX FOR REMAINING PRODUCTS ===\n');

  for (const [slug, sourceSlug] of Object.entries(SIMILAR)) {
    const srcPath = path.join(DEST, sourceSlug);
    const destPath = path.join(DEST, slug);

    if (fs.existsSync(srcPath)) {
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }

      const files = fs.readdirSync(srcPath)
        .filter(f => /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(f));

      for (const file of files.slice(0, 3)) {
        fs.copyFileSync(path.join(srcPath, file), path.join(destPath, file));
      }

      const images = files.slice(0, 3).map(f => `/images/products/yee/${slug}/${f}`);

      if (images.length > 0) {
        const result = await sql`
          UPDATE products
          SET images = ${JSON.stringify(images)}::jsonb,
              thumbnail = ${images[0]}
          WHERE slug = ${slug}
          RETURNING name
        `;

        if (result.length > 0) {
          console.log(`✓ ${slug} - using similar images from ${sourceSlug}`);
        }
      }
    } else {
      console.log(`⚠ Source folder not found: ${sourceSlug}`);
    }
  }

  // Final count
  const total = await sql`
    SELECT COUNT(*) as count FROM products
    WHERE brand ILIKE '%yee%' OR slug LIKE 'c1-%' OR slug LIKE 'c2-%'
       OR slug LIKE 'yee-%' OR slug LIKE 'yyh-%'
  `;

  const withImg = await sql`
    SELECT COUNT(*) as count FROM products
    WHERE (brand ILIKE '%yee%' OR slug LIKE 'c1-%' OR slug LIKE 'c2-%'
           OR slug LIKE 'yee-%' OR slug LIKE 'yyh-%')
      AND thumbnail IS NOT NULL
      AND thumbnail NOT LIKE '%placeholder%'
      AND thumbnail != ''
  `;

  console.log(`\n✅ Total: ${withImg[0].count}/${total[0].count} products with images`);
}

main().catch(console.error);
