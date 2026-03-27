import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  console.log("=== Replace YEE-3606 with CWD-003 ===\n");

  // 1. Get current product
  const current = await sql`SELECT id, slug, name, brand, images, thumbnail FROM products WHERE slug = 'yee-3606'`;
  
  if (current.length === 0) {
    console.log("❌ Product yee-3606 not found!");
    return;
  }

  console.log("📋 Current product:");
  console.log(`   Name: ${current[0].name}`);
  console.log(`   Images: ${JSON.stringify(current[0].images)}`);

  // 2. Get CWD-003 images
  const basePath = 'C:\\Users\\jaafa\\Desktop\\upload\\FishWebClean\\client\\public\\images\\products\\yee\\Cwd-003';
  const files = fs.readdirSync(basePath)
    .filter(f => f.match(/\.(jpg|jpeg|png|webp|gif|avif)$/i))
    .sort()
    .map(f => `/images/products/yee/Cwd-003/${f}`);

  console.log(`\n🖼 CWD-003 images (${files.length}):`);
  files.forEach(f => console.log(`   ${f}`));

  // 3. Update the product
  const productId = current[0].id;
  const newImages = JSON.stringify(files);
  const newThumbnail = files[0];

  await sql`
    UPDATE products 
    SET 
      slug = 'cwd-003',
      name = 'ميزان حرارة رقمي ذكي CWD-003',
      images = ${newImages}::jsonb,
      thumbnail = ${newThumbnail},
      updated_at = NOW()
    WHERE id = ${productId}
  `;

  console.log(`\n✅ Product updated!`);
  console.log(`   Old slug: yee-3606`);
  console.log(`   New slug: cwd-003`);
  console.log(`   New name: ميزان حرارة رقمي ذكي CWD-003`);
  console.log(`   Images: ${files.length} images from Cwd-003 folder`);
  console.log(`\n🔗 New URL: https://www.aquavoiq.com/products/cwd-003`);
}

main().catch(console.error);
