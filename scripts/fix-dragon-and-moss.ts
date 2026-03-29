/**
 * Fix Blue Dragon Stone and Moss Tree product images
 * 
 * 1. Moss Tree: DB references 'moss-tree.png' but actual files are different
 *    Actual files in dist: Gemini_Generated_Image_ks32wcks32wcks32.png, 
 *    H40c19ee9792f457998e234235df24a5dj.jpg, Ha7235746eff149fcba3abe23a05eb021u.jpg
 * 
 * 2. Blue Dragon Stone: Images exist in source (Houyi/Blue Dragon – flake/) 
 *    but folder houyi-blue-dragon-stone was never created in dist
 *    Images need to be compressed (7MB each → should be <500KB)
 */
import { neon } from '@neondatabase/serverless';

const dbUrl = 'postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';
console.log('Connecting to:', dbUrl.replace(/:[^:@]+@/, ':***@'));
const sql = neon(dbUrl);

async function main() {
  console.log('=== Fixing Dragon Stone & Moss Tree Images ===\n');

  // ── 1. Fix Moss Tree ──
  console.log('📌 Fixing Moss Tree...');
  const mossImages = [
    '/images/products/houyi/houyi-moss-tree/Gemini_Generated_Image_ks32wcks32wcks32.png',
    '/images/products/houyi/houyi-moss-tree/H40c19ee9792f457998e234235df24a5dj.jpg',
    '/images/products/houyi/houyi-moss-tree/Ha7235746eff149fcba3abe23a05eb021u.jpg',
  ];

  const mossResult = await sql`
    UPDATE products
    SET images = ${JSON.stringify(mossImages)}::jsonb,
        thumbnail = ${mossImages[0]},
        updated_at = NOW()
    WHERE slug = 'houyi-moss-tree'
    RETURNING id, slug, name, thumbnail
  `;

  if (mossResult.length > 0) {
    console.log(`✅ Moss Tree updated!`);
    console.log(`   Name: ${mossResult[0].name}`);
    console.log(`   Thumbnail: ${mossResult[0].thumbnail}`);
  } else {
    console.log('❌ Moss Tree product not found');
  }

  // ── 2. Check Blue Dragon Stone current state ──
  console.log('\n📌 Checking Blue Dragon Stone...');
  const dragonResult = await sql`
    SELECT id, slug, name, thumbnail, images
    FROM products
    WHERE slug = 'houyi-blue-dragon-stone'
  `;

  if (dragonResult.length > 0) {
    console.log(`   Name: ${dragonResult[0].name}`);
    console.log(`   Current thumbnail: ${dragonResult[0].thumbnail}`);
    console.log(`   Current images: ${JSON.stringify(dragonResult[0].images)}`);
    console.log('\n⚠️  Dragon Stone images need to be compressed and copied to dist.');
    console.log('   Source: Houyi/Blue Dragon – flake/ (3 files, ~7MB each)');
    console.log('   Target: dist/public/images/products/houyi/houyi-blue-dragon-stone/');
    console.log('   The DB paths are correct, just need the files on server.');
  } else {
    console.log('❌ Blue Dragon Stone product not found');
  }

  console.log('\n=== Done ===');
}

main().catch(console.error);
