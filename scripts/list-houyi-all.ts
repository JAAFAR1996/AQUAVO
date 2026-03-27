import { neon } from "@neondatabase/serverless";

const sql = neon("postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require");

async function main() {
  const rows = await sql`
    SELECT id, name, slug, category, brand, images, price 
    FROM products 
    WHERE (brand = 'Houyi' OR brand = 'HOUYI' OR name ILIKE '%HOUYI%' OR name ILIKE '%houyi%') 
      AND (deleted_at IS NULL) 
    ORDER BY category, name
  `;
  
  console.log(`\n=== منتجات HOUYI في قاعدة البيانات ===`);
  console.log(`العدد الإجمالي: ${rows.length}\n`);
  
  let currentCategory = "";
  let counter = 0;
  
  for (const r of rows) {
    if (r.category !== currentCategory) {
      currentCategory = r.category;
      console.log(`\n--- ${currentCategory} ---`);
    }
    counter++;
    console.log(`${counter}. [${r.slug}] ${r.name}`);
    console.log(`   الصورة: ${r.images || 'لا توجد صورة'}`);
    console.log(`   السعر: ${r.price}`);
  }
}

main().catch(console.error);
