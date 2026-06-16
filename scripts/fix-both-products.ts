/**
 * 1. Compress Dragon Stone images in client/public (7MB → <1MB)
 * 2. Revert Moss Tree DB to use moss-tree.png (exists in source at 281KB)
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';

const dbUrl = 'postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(dbUrl);

const DRAGON_DIR = path.resolve('client/public/images/products/houyi/houyi-blue-dragon-stone');

const dragonFiles = [
  'Gemini_Generated_Image_8yn4qe8yn4qe8yn4.png',
  'Gemini_Generated_Image_ikb9laikb9laikb9.png',
  'Gemini_Generated_Image_q0yguiq0yguiq0yg.png',
];

async function main() {
  // ── 1. Compress Dragon Stone images in-place ──
  console.log('=== 1. Compressing Dragon Stone Images ===\n');
  
  for (const file of dragonFiles) {
    const filePath = path.join(DRAGON_DIR, file);
    const tempPath = filePath + '.tmp';

    if (!fs.existsSync(filePath)) {
      console.log(`❌ Not found: ${file}`);
      continue;
    }

    const sourceSize = fs.statSync(filePath).size;
    console.log(`📸 ${file}: ${(sourceSize / 1024).toFixed(0)} KB`);

    // Compress to temp file, then replace original
    await sharp(filePath)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .png({ quality: 80, compressionLevel: 9 })
      .toFile(tempPath);

    // Replace original with compressed
    fs.unlinkSync(filePath);
    fs.renameSync(tempPath, filePath);

    const newSize = fs.statSync(filePath).size;
    console.log(`   → ${(newSize / 1024).toFixed(0)} KB (${((1 - newSize / sourceSize) * 100).toFixed(0)}% smaller)\n`);
  }

  // ── 2. Fix Moss Tree DB (revert to moss-tree.png) ──
  console.log('=== 2. Fixing Moss Tree DB ===\n');
  
  const mossImages = [
    '/images/products/houyi/houyi-moss-tree/moss-tree.png',
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
    console.log(`✅ Moss Tree reverted to: ${mossResult[0].thumbnail}`);
  } else {
    console.log('❌ Moss Tree not found');
  }

  console.log('\n=== All Done! Now git push to redeploy ===');
}

main().catch(console.error);
