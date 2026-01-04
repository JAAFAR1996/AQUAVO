import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

const YEE_SOURCE = 'C:/Users/jaafa/Desktop/upload/FishWebClean/yee';
const YEE_DEST = 'C:/Users/jaafa/Desktop/upload/FishWebClean/client/public/images/products/yee';

// Load Excel data
const excelData: { model: string; name_en: string }[] = JSON.parse(
  fs.readFileSync('C:/Users/jaafa/Desktop/upload/FishWebClean/yee_products_excel.json', 'utf-8')
);

// Load image folders
const imageFolders = fs.readdirSync(YEE_SOURCE)
  .filter(f => fs.statSync(path.join(YEE_SOURCE, f)).isDirectory());

// Normalize text for matching
function normalize(text: string): string {
  return text.toLowerCase()
    .replace(/[【】\[\]()（）×\*]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Find matching folder for an English name
function findImageFolder(englishName: string): string | null {
  const normalizedName = normalize(englishName);
  const nameWords = normalizedName.split(' ').filter(w => w.length > 2);

  let bestMatch: { folder: string; score: number } | null = null;

  for (const folder of imageFolders) {
    const normalizedFolder = normalize(folder);

    // Exact match
    if (normalizedFolder === normalizedName) {
      return folder;
    }

    // Partial match by keywords
    let score = 0;
    for (const word of nameWords) {
      if (normalizedFolder.includes(word)) {
        score += word.length;
      }
    }

    // Extract numbers for matching
    const nameNums = englishName.match(/\d+/g) || [];
    const folderNums = folder.match(/\d+/g) || [];
    for (const num of nameNums) {
      if (folderNums.includes(num)) score += 5;
    }

    if (score > 10 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { folder, score };
    }
  }

  return bestMatch?.folder || null;
}

// Copy folder with new name
function copyFolder(src: string, destName: string): boolean {
  const srcPath = path.join(YEE_SOURCE, src);
  const destPath = path.join(YEE_DEST, destName);

  if (!fs.existsSync(srcPath)) return false;

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

// Get images from folder
function getImages(folderName: string): string[] {
  const folderPath = path.join(YEE_DEST, folderName);
  if (!fs.existsSync(folderPath)) return [];

  return fs.readdirSync(folderPath)
    .filter(f => /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(f))
    .slice(0, 6)
    .map(f => `/images/products/yee/${folderName}/${f}`);
}

async function main() {
  console.log('=== ORGANIZING YEE IMAGES BY MODEL ===\n');

  // Step 1: Get all YEE products from database
  const dbProducts = await sql`
    SELECT id, slug, name FROM products
    WHERE brand ILIKE '%yee%' OR slug LIKE 'c1-%' OR slug LIKE 'c2-%'
       OR slug LIKE 'c3-%' OR slug LIKE 'c4-%' OR slug LIKE 'c5-%'
       OR slug LIKE 'yee-%' OR slug LIKE 'yyh-%' OR slug LIKE 'yan-%'
       OR slug LIKE 'yff-%' OR slug LIKE 'ytz-%' OR slug LIKE 'ygg-%'
       OR slug LIKE 'ysl-%' OR slug LIKE 'ykl-%' OR slug LIKE 'yll-%'
       OR slug LIKE 'pyd-%' OR slug LIKE 'nyh-%' OR slug LIKE 'ylc-%'
       OR slug LIKE 'led-%' OR slug LIKE 'cls-%' OR slug LIKE 'yyy-%'
       OR slug LIKE 'yaa-%' OR slug LIKE 'yxl-%' OR slug LIKE 'ykk-%'
       OR slug LIKE 'ycg-%'
    ORDER BY slug
  `;

  console.log(`Found ${dbProducts.length} YEE products in database\n`);

  let matched = 0;
  let notFound = 0;
  const results: { slug: string; name: string; folder: string | null; status: string }[] = [];

  for (const product of dbProducts) {
    const slug = product.slug.toLowerCase();

    // Step 2: Find English name from Excel
    const excelEntry = excelData.find(e => e.model.toLowerCase() === slug);

    if (!excelEntry) {
      results.push({ slug, name: product.name, folder: null, status: 'no_excel' });
      continue;
    }

    // Step 3: Find matching image folder
    const imageFolder = findImageFolder(excelEntry.name_en);

    if (!imageFolder) {
      results.push({ slug, name: product.name, folder: null, status: 'no_folder' });
      notFound++;
      continue;
    }

    // Step 4: Copy folder with model name
    const modelFolder = slug;
    if (copyFolder(imageFolder, modelFolder)) {
      // Step 5: Update database
      const images = getImages(modelFolder);

      if (images.length > 0) {
        await sql`
          UPDATE products
          SET images = ${JSON.stringify(images)}::jsonb,
              thumbnail = ${images[0]}
          WHERE slug = ${slug}
        `;

        console.log(`✓ ${slug} <- "${imageFolder.substring(0, 40)}..." (${images.length} images)`);
        results.push({ slug, name: product.name, folder: imageFolder, status: 'success' });
        matched++;
      } else {
        results.push({ slug, name: product.name, folder: imageFolder, status: 'empty_folder' });
      }
    }
  }

  // Summary
  console.log('\n=== SUMMARY ===');
  console.log(`Matched: ${matched}`);
  console.log(`Not found: ${notFound}`);

  console.log('\n=== PRODUCTS WITHOUT IMAGES ===');
  const noImages = results.filter(r => r.status !== 'success');
  for (const r of noImages) {
    console.log(`  ${r.slug}: ${r.status} - ${r.name.substring(0, 40)}`);
  }

  // Save report
  fs.writeFileSync('yee_organize_report.json', JSON.stringify(results, null, 2));
  console.log('\nReport saved to yee_organize_report.json');
}

main().catch(console.error);
