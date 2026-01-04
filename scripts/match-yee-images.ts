import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';

const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

const YEE_IMAGES_PATH = 'C:/Users/jaafa/Desktop/upload/FishWebClean/yee';

// Normalize text for matching
function normalize(text: string): string {
  return text.toLowerCase()
    .replace(/[【】\[\]()（）]/g, '')
    .replace(/[^a-z0-9\u4e00-\u9fff]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Get images from a folder
function getImagesFromFolder(folderPath: string): string[] {
  try {
    const files = fs.readdirSync(folderPath);
    return files
      .filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f))
      .map(f => `/images/products/yee/${path.basename(folderPath)}/${f}`);
  } catch {
    return [];
  }
}

// Match product name with image folder
function findMatchingFolder(productName: string, folders: string[]): string | null {
  const normalizedProduct = normalize(productName);
  const productWords = normalizedProduct.split(' ').filter(w => w.length > 2);

  let bestMatch: { folder: string; score: number } | null = null;

  for (const folder of folders) {
    const normalizedFolder = normalize(folder);
    const folderWords = normalizedFolder.split(' ').filter(w => w.length > 2);

    // Count matching words
    let matchScore = 0;
    for (const word of productWords) {
      if (normalizedFolder.includes(word)) {
        matchScore += word.length;
      }
    }

    // Check for key phrase matches
    if (normalizedFolder.includes('betta') && normalizedProduct.includes('betta')) matchScore += 20;
    if (normalizedFolder.includes('goldfish') && normalizedProduct.includes('goldfish')) matchScore += 20;
    if (normalizedFolder.includes('heater') && normalizedProduct.includes('heater')) matchScore += 20;
    if (normalizedFolder.includes('thermometer') && normalizedProduct.includes('thermometer')) matchScore += 20;
    if (normalizedFolder.includes('filter') && normalizedProduct.includes('filter')) matchScore += 15;
    if (normalizedFolder.includes('pump') && normalizedProduct.includes('pump')) matchScore += 15;
    if (normalizedFolder.includes('food') && normalizedProduct.includes('food')) matchScore += 15;
    if (normalizedFolder.includes('feed') && normalizedProduct.includes('feed')) matchScore += 15;

    // Check for size/wattage matches
    const productSizes = productName.match(/\d+[wW]|\d+mm|\d+g|\d+ml|\d+L/gi) || [];
    const folderSizes = folder.match(/\d+[wW]|\d+mm|\d+g|\d+ml|\d+L/gi) || [];
    for (const size of productSizes) {
      if (folderSizes.some(fs => fs.toLowerCase() === size.toLowerCase())) {
        matchScore += 10;
      }
    }

    if (matchScore > 5 && (!bestMatch || matchScore > bestMatch.score)) {
      bestMatch = { folder, score: matchScore };
    }
  }

  return bestMatch?.folder || null;
}

// Products that should be merged into variants
const VARIANT_GROUPS: { [baseSlug: string]: { name: string; variants: { model: string; label: string; spec: string }[] } } = {
  'yee-steel-heater': {
    name: 'YEE سخان ستيل نقي',
    variants: [
      { model: 'YEE-3006', label: '50 واط', spec: '50W' },
      { model: 'YEE-3007', label: '100 واط', spec: '100W' },
      { model: 'YEE-3008', label: '200 واط', spec: '200W' },
    ]
  },
  'yee-water-grass-mud': {
    name: 'YEE تربة نباتات مائية',
    variants: [
      { model: 'YFF-049', label: 'ناعم 1.5 لتر', spec: '1.5L fine' },
      { model: 'YFF-052', label: 'خشن 3 لتر', spec: '3L coarse' },
    ]
  },
  'yee-air-tube': {
    name: 'YEE خرطوم هواء مقوى',
    variants: [
      { model: 'C5-1144', label: '1.5 متر', spec: '1.5m' },
      { model: 'YEE-3621', label: '1.7 متر', spec: '1.7m' },
    ]
  },
  'yee-glass-tank': {
    name: 'YEE حوض زجاج شفاف',
    variants: [
      { model: 'YEE-1090', label: '35×35×35 سم', spec: '35cm' },
      { model: 'YCG-40', label: '40×40×40 سم', spec: '40cm' },
      { model: 'YXL-003', label: '40×23×25 سم', spec: '40x23x25' },
      { model: 'YKK-50', label: '50×27×30 سم', spec: '50cm' },
      { model: 'YKK-60', label: '60×30×35 سم', spec: '60cm' },
      { model: 'C5-1062', label: '60×40×40 سم', spec: '60x40x40' },
    ]
  },
  'yee-anti-stress-stabilizer': {
    name: 'YEE مثبت مياه مضاد للتوتر',
    variants: [
      { model: 'YYH-173', label: '500 مل', spec: '500ml' },
      { model: 'YYH-216', label: '1000 مل', spec: '1000ml' },
    ]
  },
  'yee-nitrifying-bacteria': {
    name: 'YEE بكتيريا نافعة + بروبيوتيك كبسولات',
    variants: [
      { model: 'C2-1005', label: '50 كبسولة', spec: '50 capsules' },
    ]
  },
  'yee-ammonia-probiotics': {
    name: 'YEE منظف أمونيا مع بروبيوتيك نشط',
    variants: [
      { model: 'c2-1016', label: '760 مل', spec: '760ml' },
    ]
  }
};

async function main() {
  console.log('=== MATCHING YEE IMAGES WITH PRODUCTS ===\n');

  // Get all image folders
  const folders = fs.readdirSync(YEE_IMAGES_PATH)
    .filter(f => fs.statSync(path.join(YEE_IMAGES_PATH, f)).isDirectory());
  console.log(`Found ${folders.length} image folders\n`);

  // Get YEE products from database
  const dbProducts = await sql`
    SELECT id, slug, name, brand, images, thumbnail, has_variants, variants
    FROM products
    WHERE brand ILIKE '%yee%' OR slug LIKE 'c1-%' OR slug LIKE 'c2-%' OR slug LIKE 'c3-%'
       OR slug LIKE 'c4-%' OR slug LIKE 'c5-%' OR slug LIKE 'yee-%' OR slug LIKE 'yyy-%'
       OR slug LIKE 'yyh-%' OR slug LIKE 'yan-%' OR slug LIKE 'yff-%' OR slug LIKE 'ytz-%'
       OR slug LIKE 'ygg-%' OR slug LIKE 'ysl-%' OR slug LIKE 'ykl-%' OR slug LIKE 'yll-%'
       OR slug LIKE 'pyd-%' OR slug LIKE 'nyh-%' OR slug LIKE 'ylc-%' OR slug LIKE 'led-%'
       OR slug LIKE 'cls-%' OR slug LIKE 'yxl-%' OR slug LIKE 'ykk-%' OR slug LIKE 'ycg-%'
    ORDER BY slug
  `;
  console.log(`Found ${dbProducts.length} YEE products in database\n`);

  // Match products with image folders
  const matches: { product: any; folder: string; images: string[] }[] = [];
  const noMatch: any[] = [];

  for (const product of dbProducts) {
    const matchedFolder = findMatchingFolder(product.name, folders);

    if (matchedFolder) {
      const folderPath = path.join(YEE_IMAGES_PATH, matchedFolder);
      const images = getImagesFromFolder(folderPath);

      if (images.length > 0) {
        matches.push({ product, folder: matchedFolder, images });
        console.log(`✓ ${product.slug} -> ${matchedFolder} (${images.length} images)`);
      } else {
        noMatch.push(product);
        console.log(`⚠ ${product.slug} -> ${matchedFolder} (no images)`);
      }
    } else {
      noMatch.push(product);
      console.log(`✗ ${product.slug} - ${product.name.substring(0, 40)}`);
    }
  }

  console.log(`\n=== RESULTS ===`);
  console.log(`Matched: ${matches.length}`);
  console.log(`No match: ${noMatch.length}`);

  // Update products with images
  console.log('\n=== UPDATING PRODUCTS WITH IMAGES ===\n');
  let updated = 0;

  for (const match of matches) {
    try {
      await sql`
        UPDATE products
        SET
          images = ${JSON.stringify(match.images)}::jsonb,
          thumbnail = ${match.images[0]}
        WHERE id = ${match.product.id}
      `;
      console.log(`✓ Updated: ${match.product.slug}`);
      updated++;
    } catch (error: any) {
      console.log(`✗ Error: ${match.product.slug} - ${error.message}`);
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Products updated with images: ${updated}`);

  // Save report
  const report = {
    matched: matches.map(m => ({ slug: m.product.slug, folder: m.folder, imageCount: m.images.length })),
    noMatch: noMatch.map(p => ({ slug: p.slug, name: p.name }))
  };
  fs.writeFileSync('yee_image_matching_report.json', JSON.stringify(report, null, 2));
  console.log('\nReport saved to yee_image_matching_report.json');
}

main().catch(console.error);
