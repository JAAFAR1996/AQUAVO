import { neon } from '@neondatabase/serverless';

const DB = 'postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = neon(DB);

// Get all products with price = 0 but have variants with prices
const zeroProducts = await sql`
  SELECT id, name, price, slug, variants 
  FROM products 
  WHERE (price = 0 OR price IS NULL)
  AND variants IS NOT NULL
`;

console.log(`Found ${zeroProducts.length} zero-price products with variants\n`);

let updated = 0;
let skipped = 0;

for (const product of zeroProducts) {
  const variants = product.variants;
  if (!Array.isArray(variants) || variants.length === 0) {
    console.log(`SKIP (no variants array): ${product.slug}`);
    skipped++;
    continue;
  }

  const prices = variants.map(v => Number(v.price)).filter(p => p > 0);
  
  if (prices.length === 0) {
    console.log(`SKIP (all variants also 0): ${product.slug}`);
    skipped++;
    continue;
  }

  const minPrice = Math.min(...prices);
  
  await sql`UPDATE products SET price = ${minPrice} WHERE id = ${product.id}`;
  console.log(`✅ UPDATED: ${product.slug} → price = ${minPrice.toLocaleString()} د.ع`);
  updated++;
}

console.log(`\n✅ Done! Updated: ${updated} | Skipped: ${skipped}`);
