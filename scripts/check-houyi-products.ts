import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

const houyiProducts = JSON.parse(fs.readFileSync('houyi_products_clean.json', 'utf-8'));

// Normalize text for matching
function normalize(text: string): string {
  return text.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/\s+/g, '');
}

async function main() {
  console.log('=== CHECKING HOUYI PRODUCTS IN DATABASE ===\n');

  // Get all products from database
  const dbProducts = await sql`SELECT id, name, slug, brand FROM products ORDER BY slug`;
  console.log(`Total products in database: ${dbProducts.length}`);

  // Get Houyi products specifically
  const houyiDbProducts = dbProducts.filter((p: any) =>
    p.slug?.toLowerCase().includes('houyi') ||
    p.brand?.toLowerCase().includes('houyi')
  );
  console.log(`Houyi products in database: ${houyiDbProducts.length}`);

  // Print all Houyi products in database
  console.log('\n=== HOUYI PRODUCTS IN DATABASE ===');
  houyiDbProducts.forEach((p: any, i: number) => {
    console.log(`${i + 1}. ${p.slug}`);
  });

  // Match Excel products with database
  console.log('\n=== MATCHING ANALYSIS ===');
  const matched: any[] = [];
  const missing: any[] = [];

  for (const hp of houyiProducts) {
    const productName = normalize(hp.product_name);

    // Try to find match in database
    const match = dbProducts.find((dp: any) => {
      const dbName = normalize(dp.name);
      const dbSlug = normalize(dp.slug);

      // Various matching strategies
      if (productName.includes('fishnet') && dbSlug.includes('fishnet')) return true;
      if (productName.includes('thermometer') && dbSlug.includes('thermometer')) return true;
      if (productName.includes('skimmer') && dbSlug.includes('skimmer')) return true;
      if (productName.includes('rhododendron') && dbSlug.includes('rhododendron')) return true;
      if (productName.includes('driftwood') && dbSlug.includes('driftwood')) return true;
      if (productName.includes('mosstreee') && dbSlug.includes('moss')) return true;
      if (productName.includes('pumice') && dbSlug.includes('pumice')) return true;
      if (productName.includes('riversand') && dbSlug.includes('river')) return true;
      if (productName.includes('whitesand') && dbSlug.includes('white')) return true;
      if (productName.includes('dutchsand') && dbSlug.includes('dutch')) return true;
      if (productName.includes('volcanic') && dbSlug.includes('volcanic')) return true;
      if (productName.includes('mossglue') && dbSlug.includes('moss') && dbSlug.includes('glue')) return true;
      if (productName.includes('silicone') && dbSlug.includes('silicone')) return true;
      if (productName.includes('ceramicring') && dbSlug.includes('ceramic')) return true;
      if (productName.includes('breathingring') && dbSlug.includes('breathing')) return true;
      if (productName.includes('activatedcarbon') && dbSlug.includes('activated')) return true;
      if (productName.includes('whitecotton') && dbSlug.includes('cotton')) return true;
      if (productName.includes('terminalia') && dbSlug.includes('terminalia')) return true;
      if (productName.includes('foamglue') && dbSlug.includes('foam')) return true;
      if (productName.includes('checkvalve') && dbSlug.includes('check') && dbSlug.includes('valve')) return true;
      if (productName.includes('bluedragon') && dbSlug.includes('blue') && dbSlug.includes('dragon')) return true;
      if (productName.includes('streamsand') && dbSlug.includes('stream')) return true;
      if (productName.includes('stainlesssteelshunt') && dbSlug.includes('shunt')) return true;
      if (productName.includes('sucttioncup') && dbSlug.includes('suction')) return true;
      if (productName.includes('springbrush') && dbSlug.includes('brush')) return true;
      if (productName.includes('fiveinone') && dbSlug.includes('five')) return true;
      if (productName.includes('waterchanger') && dbSlug.includes('water')) return true;

      return false;
    });

    if (match) {
      matched.push({ excel: hp, db: match });
    } else {
      missing.push(hp);
    }
  }

  console.log(`\nMatched: ${matched.length}/${houyiProducts.length}`);
  console.log(`Missing: ${missing.length}/${houyiProducts.length}`);

  // Show matched
  console.log('\n=== MATCHED PRODUCTS ===');
  matched.forEach((m, i) => {
    console.log(`${i + 1}. Excel: ${m.excel.product_name.substring(0, 40)}`);
    console.log(`   DB slug: ${m.db.slug}`);
  });

  // Show missing
  console.log('\n=== MISSING PRODUCTS ===');
  missing.forEach((m, i) => {
    console.log(`${i + 1}. ${m.product_name}`);
  });

  // Save results
  fs.writeFileSync('houyi_comparison_results.json', JSON.stringify({ matched, missing }, null, 2));
  console.log('\nResults saved to houyi_comparison_results.json');
}

main().catch(console.error);
