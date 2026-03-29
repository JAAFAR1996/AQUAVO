/**
 * Compress Blue Dragon Stone images from ~7MB to <500KB
 * and copy to dist/public/images/products/houyi/houyi-blue-dragon-stone/
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const SOURCE_DIR = path.resolve('Houyi/Blue Dragon – flake');
const TARGET_DIR = path.resolve('dist/public/images/products/houyi/houyi-blue-dragon-stone');

const files = [
  'Gemini_Generated_Image_8yn4qe8yn4qe8yn4.png',
  'Gemini_Generated_Image_ikb9laikb9laikb9.png',
  'Gemini_Generated_Image_q0yguiq0yguiq0yg.png',
];

async function main() {
  console.log('=== Compressing Blue Dragon Stone Images ===\n');

  // Create target directory
  if (!fs.existsSync(TARGET_DIR)) {
    fs.mkdirSync(TARGET_DIR, { recursive: true });
    console.log(`📁 Created: ${TARGET_DIR}\n`);
  }

  for (const file of files) {
    const sourcePath = path.join(SOURCE_DIR, file);
    const targetPath = path.join(TARGET_DIR, file);

    if (!fs.existsSync(sourcePath)) {
      console.log(`❌ Source not found: ${sourcePath}`);
      continue;
    }

    const sourceSize = fs.statSync(sourcePath).size;
    console.log(`📸 Processing: ${file}`);
    console.log(`   Source size: ${(sourceSize / 1024).toFixed(0)} KB`);

    // Compress PNG: resize to max 1200px wide, optimize
    await sharp(sourcePath)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .png({ quality: 80, compressionLevel: 9 })
      .toFile(targetPath);

    const targetSize = fs.statSync(targetPath).size;
    console.log(`   Output size: ${(targetSize / 1024).toFixed(0)} KB`);
    console.log(`   Compression: ${((1 - targetSize / sourceSize) * 100).toFixed(1)}% smaller\n`);
  }

  console.log('=== Done! ===');
  console.log(`Files saved to: ${TARGET_DIR}`);
}

main().catch(console.error);
