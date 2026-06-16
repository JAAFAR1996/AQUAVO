import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  console.log('=== Checking general-air-stone ===\n');

  // Check the product
  const result = await sql`
    SELECT id, name, slug, description, price, stock, specifications, 
           category, subcategory, images, thumbnail, deleted_at
    FROM products 
    WHERE id = 'general-air-stone' OR slug = 'general-air-stone'
  `;

  if (result.length > 0) {
    const p = result[0];
    console.log(`ID: ${p.id}`);
    console.log(`Name: ${p.name}`);
    console.log(`Price: ${p.price} IQD`);
    console.log(`Stock: ${p.stock}`);
    console.log(`Category: ${p.category}/${p.subcategory}`);
    console.log(`Description: ${p.description?.substring(0, 300)}`);
    console.log(`Specs: ${JSON.stringify(p.specifications, null, 2)}`);
    console.log(`Images: ${JSON.stringify(p.images)}`);
    console.log(`Deleted: ${p.deleted_at || 'NO'}`);
  } else {
    console.log('❌ Not found by id/slug "general-air-stone"');
    // Try broader search
    const search = await sql`SELECT id, name FROM products WHERE LOWER(name) LIKE '%حجر فقاع%' OR LOWER(id) LIKE '%air-stone%' OR LOWER(name) LIKE '%air stone%'`;
    console.log(`\nBroader search: ${search.length} results`);
    search.forEach(r => console.log(`  → ${r.id} | ${r.name}`));
  }

  // Check how variants work - look for products with variants
  console.log('\n=== Checking variant structure in DB ===');
  const cols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'products' AND (column_name LIKE '%variant%' OR column_name LIKE '%option%' OR column_name LIKE '%size%') ORDER BY ordinal_position`;
  console.log(`Variant-related columns: ${cols.length}`);
  cols.forEach(c => console.log(`  → ${c.column_name} (${c.data_type})`));

  // Check if there's a variants table
  const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND (table_name LIKE '%variant%' OR table_name LIKE '%option%')`;
  console.log(`\nVariant-related tables: ${tables.length}`);
  tables.forEach(t => console.log(`  → ${t.table_name}`));

  // Check all columns in products table
  console.log('\n=== All products columns ===');
  const allCols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'products' ORDER BY ordinal_position`;
  allCols.forEach(c => console.log(`  ${c.column_name} (${c.data_type})`));
}

main().catch(e => console.error(e));
