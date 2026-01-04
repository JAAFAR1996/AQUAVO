import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

const jaafarProducts = JSON.parse(fs.readFileSync('jaafar_products_clean.json', 'utf-8'));

async function main() {
  console.log('=== FINAL VERIFICATION ===\n');

  // Get all products from database
  const dbProducts = await sql`SELECT id, name, slug FROM products ORDER BY slug`;
  console.log(`Total products in database: ${dbProducts.length}`);

  // Get unique models from Jaafar file
  const jaafarModels = [...new Set(jaafarProducts.map((p: any) => p.model.toLowerCase()))];
  console.log(`Unique products in Jaafar file: ${jaafarModels.length}`);

  // Check each Jaafar product
  const matched: string[] = [];
  const missing: string[] = [];

  for (const model of jaafarModels) {
    const found = dbProducts.find((dp: any) =>
      dp.slug.toLowerCase() === model.toLowerCase() ||
      dp.slug.toLowerCase().includes(model.toLowerCase().replace('.', ''))
    );

    if (found) {
      matched.push(model);
    } else {
      missing.push(model);
    }
  }

  console.log(`\n=== MATCHED: ${matched.length}/${jaafarModels.length} ===`);
  matched.forEach((m, i) => console.log(`${i + 1}. ${m}`));

  if (missing.length > 0) {
    console.log(`\n=== STILL MISSING: ${missing.length} ===`);
    missing.forEach((m, i) => console.log(`${i + 1}. ${m}`));
  } else {
    console.log('\n✅ ALL PRODUCTS ARE NOW IN DATABASE!');
  }

  // Show all Yee products with their slugs
  console.log('\n=== ALL PRODUCTS WITH MODEL SLUGS ===');
  const modelSlugs = dbProducts.filter((p: any) =>
    p.slug.match(/^[a-z]{1,3}\d?-\d+$|^yee-\d+$|^yyy-\d+$|^nyh-\d+$|^pyd-\d+$|^led-\d+$|^cls-\d+$/)
  );
  modelSlugs.forEach((p: any, i: number) => console.log(`${i + 1}. ${p.slug} - ${p.name.substring(0, 40)}`));
}

main().catch(console.error);
