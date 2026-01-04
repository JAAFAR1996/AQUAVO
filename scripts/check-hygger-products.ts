import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

const hyggerProducts = JSON.parse(fs.readFileSync('hygger_products.json', 'utf-8'));

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function main() {
  console.log('=== CHECKING HYGGER PRODUCTS IN DATABASE ===\n');

  // Get all products from database
  const dbProducts = await sql`SELECT id, name, slug, brand FROM products ORDER BY slug`;
  console.log(`Total products in database: ${dbProducts.length}`);

  // Get Hygger products specifically
  const hyggerDbProducts = dbProducts.filter((p: any) =>
    p.slug?.toLowerCase().includes('hygger') ||
    p.brand?.toLowerCase().includes('hygger') ||
    p.slug?.toLowerCase().startsWith('hg')
  );
  console.log(`Hygger products in database: ${hyggerDbProducts.length}`);

  // Print all Hygger products in database
  console.log('\n=== HYGGER PRODUCTS IN DATABASE ===');
  hyggerDbProducts.forEach((p: any, i: number) => {
    console.log(`${i + 1}. ${p.slug} - ${p.name?.substring(0, 50)}`);
  });

  // Get unique models from Excel file
  const excelModels = [...new Set(hyggerProducts.map((p: any) => p.model))];
  console.log(`\n=== EXCEL FILE MODELS (${excelModels.length}) ===`);
  excelModels.forEach((m, i) => console.log(`${i + 1}. ${m}`));

  // Match Excel products with database
  console.log('\n=== MATCHING ANALYSIS ===');
  const matched: any[] = [];
  const missing: any[] = [];

  for (const hp of hyggerProducts) {
    const model = hp.model.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Try to find match in database by model number
    const match = dbProducts.find((dp: any) => {
      const dbSlug = dp.slug?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
      const dbName = dp.name?.toLowerCase() || '';

      // Match by model number in slug
      if (dbSlug.includes(model)) return true;

      // Match by product name keywords
      const productName = hp.product_name.toLowerCase();
      if (productName.includes('light') && dbSlug.includes('light')) {
        if (model.includes('978') && dbSlug.includes('978')) return true;
        if (model.includes('957') && dbSlug.includes('957')) return true;
      }
      if (productName.includes('heater') && dbSlug.includes('heater') && model.includes('085')) return true;
      if (productName.includes('filter') && dbSlug.includes('filter')) {
        if (model.includes('153') && dbSlug.includes('153')) return true;
        if (model.includes('101') && dbSlug.includes('101')) return true;
        if (model.includes('150') && dbSlug.includes('150')) return true;
      }
      if (productName.includes('air pump') && dbSlug.includes('pump')) {
        if (model.includes('037') && dbSlug.includes('037')) return true;
        if (model.includes('958') && dbSlug.includes('958')) return true;
        if (model.includes('087') && dbSlug.includes('087')) return true;
      }
      if (productName.includes('cleaning') && dbSlug.includes('clean')) return true;
      if (productName.includes('magnetic') && dbSlug.includes('magnet')) return true;
      if (productName.includes('thermometer') && dbSlug.includes('thermo')) return true;
      if (productName.includes('test') && dbSlug.includes('test')) return true;
      if (productName.includes('background') && dbSlug.includes('background')) return true;

      return false;
    });

    if (match) {
      matched.push({ excel: hp, db: match });
    } else {
      missing.push(hp);
    }
  }

  console.log(`\nMatched: ${matched.length}/${hyggerProducts.length}`);
  console.log(`Missing: ${missing.length}/${hyggerProducts.length}`);

  // Show matched
  console.log('\n=== MATCHED PRODUCTS ===');
  matched.forEach((m, i) => {
    console.log(`${i + 1}. Excel: ${m.excel.model} -> DB: ${m.db.slug}`);
  });

  // Show missing
  console.log('\n=== MISSING PRODUCTS ===');
  missing.forEach((m, i) => {
    console.log(`${i + 1}. ${m.model} - ${m.product_name.substring(0, 50)}`);
  });

  // Save results
  fs.writeFileSync('hygger_comparison_results.json', JSON.stringify({ matched, missing, dbProducts: hyggerDbProducts }, null, 2));
  console.log('\nResults saved to hygger_comparison_results.json');
}

main().catch(console.error);
