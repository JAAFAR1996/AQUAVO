import { neon } from '@neondatabase/serverless';
import fs from 'fs';
const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  // 1. جلب منتج الدريفت وود كمثال للـ variants
  const driftwood = await sql`
    SELECT id, name, price, has_variants, variants
    FROM products WHERE id = 'houyi-polished-driftwood'
  `;
  
  // 2. جلب السبايدر وود المنفصلة
  const spiders = await sql`
    SELECT id, name, price, stock, has_variants
    FROM products WHERE deleted_at IS NULL AND id LIKE 'houyi-spider-wood%' ORDER BY id
  `;

  // 3. جلب كل المنتجات اللي عندها variants
  const withVar = await sql`
    SELECT id, name FROM products 
    WHERE deleted_at IS NULL AND brand = 'Houyi' AND has_variants = true ORDER BY id
  `;

  const output = {
    "products_with_variants": withVar.map((p: any) => `${p.id}: ${p.name}`),
    "spider_woods": spiders,
    "driftwood_variant_example": driftwood[0]
  };
  
  fs.writeFileSync('variant-check.json', JSON.stringify(output, null, 2));
  console.log("Saved to variant-check.json");
}
main().catch(console.error);
