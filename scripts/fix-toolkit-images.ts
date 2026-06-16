import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  console.log('=== Fixing houyi-tool-kit images ===\n');

  const newImages = [
    '/images/products/houyi/houyi-tool-kit/H2b94461f124d4a4f876adaa49d515469t.jpg',
    '/images/products/houyi/houyi-tool-kit/H9a1727db462e4665b7c3db1c23f110b7j.jpg'
  ];
  const newThumbnail = newImages[0];

  await sql`
    UPDATE products SET
      images = ${JSON.stringify(newImages)}::jsonb,
      thumbnail = ${newThumbnail},
      updated_at = NOW()
    WHERE id = 'houyi-tool-kit'
  `;

  console.log('✅ houyi-tool-kit images updated!');
  console.log(`   Thumbnail: ${newThumbnail}`);
  console.log(`   Images: ${newImages.length} files`);

  // Verify
  const verify = await sql`
    SELECT id, name, thumbnail, images FROM products WHERE id = 'houyi-tool-kit'
  `;
  console.log('\n--- Verification ---');
  console.log(`ID: ${verify[0].id}`);
  console.log(`Name: ${verify[0].name}`);
  console.log(`Thumbnail: ${verify[0].thumbnail}`);
  console.log(`Images: ${JSON.stringify(verify[0].images)}`);
  console.log('\n=== Done! ===');
}

main().catch(e => console.error(e));
