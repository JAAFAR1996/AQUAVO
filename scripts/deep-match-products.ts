import { neon } from '@neondatabase/serverless';
import fs from 'fs';

const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

const jaafarProducts = JSON.parse(fs.readFileSync('jaafar_products_clean.json', 'utf-8'));

function normalizeText(text: string): string {
  return text.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/yee/g, '')
    .replace(/yipai/g, '')
    .replace(/aquarium/g, '')
    .replace(/brand/g, '');
}

function findMatch(jp: any, dbProducts: any[]): any {
  const model = jp.model.toLowerCase();
  const englishName = normalizeText(jp.english_name);

  // Try exact model match first
  for (const dp of dbProducts) {
    if (dp.slug.includes(model.replace(/[^a-z0-9]/g, '-'))) {
      return { type: 'model', product: dp };
    }
  }

  // Try name match
  for (const dp of dbProducts) {
    const dbSlug = normalizeText(dp.slug);
    const dbName = normalizeText(dp.name);

    // Check key words
    const keyWords = englishName.split('').filter((w: string) => w.length > 3);
    const matchCount = keyWords.filter((w: string) =>
      dbSlug.includes(w) || dbName.includes(w)
    ).length;

    if (matchCount > 2) {
      return { type: 'partial', product: dp, score: matchCount };
    }
  }

  return null;
}

async function main() {
  const dbProducts = await sql`SELECT id, name, slug FROM products ORDER BY slug`;

  console.log('=== DEEP MATCHING ANALYSIS ===\n');

  const matched: any[] = [];
  const missing: any[] = [];

  for (const jp of jaafarProducts) {
    const match = findMatch(jp, dbProducts);
    if (match) {
      matched.push({ excel: jp, db: match.product, matchType: match.type });
    } else {
      missing.push(jp);
    }
  }

  console.log(`Matched: ${matched.length}/${jaafarProducts.length}`);
  console.log(`Missing: ${missing.length}/${jaafarProducts.length}`);

  console.log('\n=== MATCHED PRODUCTS (need slug update) ===');
  matched.forEach((m, i) => {
    console.log(`${i+1}. Model: ${m.excel.model}`);
    console.log(`   Excel: ${m.excel.english_name.substring(0, 50)}`);
    console.log(`   DB slug: ${m.db.slug}`);
    console.log(`   New slug should be: ${m.excel.model.toLowerCase()}`);
    console.log();
  });

  console.log('\n=== TRULY MISSING PRODUCTS ===');
  missing.forEach((m, i) => {
    console.log(`${i+1}. Model: ${m.model} | ${m.english_name}`);
  });

  // Save for later processing
  fs.writeFileSync('products_to_update.json', JSON.stringify({ matched, missing }, null, 2));
  console.log('\nSaved to products_to_update.json');
}

main().catch(console.error);
