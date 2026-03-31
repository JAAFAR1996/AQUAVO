import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  console.log('=== Fixing houyi-control-valve images ===\n');

  const newImages = [
    '/images/products/houyi/houyi-control-valve-4mm/A_high-quality_studio_202603302035.png',
    '/images/products/houyi/houyi-control-valve-4mm/Use_the_provided_202603302039.png',
    '/images/products/houyi/houyi-control-valve-4mm/A_realistic_scene_202603302041.png'
  ];
  const newThumbnail = newImages[0];

  await sql`
    UPDATE products SET
      images = ${JSON.stringify(newImages)}::jsonb,
      thumbnail = ${newThumbnail},
      updated_at = NOW()
    WHERE id = 'houyi-control-valve'
  `;

  console.log('✅ houyi-control-valve images updated!');
  console.log(`   Thumbnail: ${newThumbnail}`);
  console.log(`   Images: ${newImages.length} files`);

  // Verify both products
  console.log('\n=== Final Verification ===\n');
  const verify = await sql`
    SELECT id, name, thumbnail, images, deleted_at
    FROM products 
    WHERE id IN ('houyi-control-valve', 'houyi-tool-kit')
  `;
  for (const p of verify) {
    console.log(`✅ ${p.id}`);
    console.log(`   Name: ${p.name}`);
    console.log(`   Thumbnail: ${p.thumbnail}`);
    console.log(`   Images: ${p.images.length} files`);
    console.log(`   Deleted: ${p.deleted_at || 'NO'}\n`);
  }

  console.log('=== Done! ===');
}

main().catch(e => console.error(e));
