import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  console.log('=== Fixing Stream Sand Images ===\n');

  const images = [
    '/images/products/houyi/houyi-stream-sand/H010aa328be774f5999b9cd7b47f4be438.png',
    '/images/products/houyi/houyi-stream-sand/H79cd02f171764b499fca67c99178a5f4D.jpg',
  ];

  const thumbnail = images[0];

  const result = await sql`
    UPDATE products
    SET images = ${JSON.stringify(images)}::jsonb,
        thumbnail = ${thumbnail},
        updated_at = NOW()
    WHERE slug = 'houyi-stream-sand'
    RETURNING id, slug, name, thumbnail
  `;

  if (result.length > 0) {
    console.log('✅ Updated successfully!');
    console.log(`   Product: ${result[0].name}`);
    console.log(`   Slug: ${result[0].slug}`);
    console.log(`   Thumbnail: ${result[0].thumbnail}`);
  } else {
    console.log('❌ Product not found');
  }
}

main().catch(console.error);
