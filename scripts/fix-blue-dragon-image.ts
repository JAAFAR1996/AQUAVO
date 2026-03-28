/**
 * Fix Blue Dragon Stone product images
 * The product was incorrectly mapped to houyi-wood-products folder (showing Spider Wood)
 * Now pointing to the correct houyi-blue-dragon-stone folder
 */
import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  console.log('=== Fixing Blue Dragon Stone Images ===\n');

  const images = [
    '/images/products/houyi/houyi-blue-dragon-stone/Gemini_Generated_Image_8yn4qe8yn4qe8yn4.png',
    '/images/products/houyi/houyi-blue-dragon-stone/Gemini_Generated_Image_ikb9laikb9laikb9.png',
    '/images/products/houyi/houyi-blue-dragon-stone/Gemini_Generated_Image_q0yguiq0yguiq0yg.png',
  ];

  const thumbnail = images[0];

  // Update the product
  const result = await sql`
    UPDATE products
    SET images = ${JSON.stringify(images)}::jsonb,
        thumbnail = ${thumbnail},
        updated_at = NOW()
    WHERE slug = 'houyi-blue-dragon-stone'
    RETURNING id, slug, name, thumbnail
  `;

  if (result.length > 0) {
    console.log('✅ Updated successfully!');
    console.log(`   Product: ${result[0].name}`);
    console.log(`   Slug: ${result[0].slug}`);
    console.log(`   Thumbnail: ${result[0].thumbnail}`);
    console.log(`   Images: ${images.length} images`);
  } else {
    console.log('❌ Product not found with slug "houyi-blue-dragon-stone"');
    
    // Try finding by id
    const byId = await sql`
      SELECT id, slug, name FROM products WHERE id = 'houyi-blue-dragon-stone'
    `;
    if (byId.length > 0) {
      console.log(`   Found by ID: ${byId[0].slug} - ${byId[0].name}`);
      await sql`
        UPDATE products
        SET images = ${JSON.stringify(images)}::jsonb,
            thumbnail = ${thumbnail},
            updated_at = NOW()
        WHERE id = 'houyi-blue-dragon-stone'
      `;
      console.log('✅ Updated by ID!');
    }
  }
}

main().catch(console.error);
