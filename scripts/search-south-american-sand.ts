import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  console.log('=== Searching for South American Sands ===\n');

  // Search by various keywords
  const kw1 = await sql`SELECT id, name, deleted_at FROM products WHERE LOWER(name) LIKE '%south%american%' OR LOWER(id) LIKE '%south-american%'`;
  console.log(`"south american": ${kw1.length} results`);
  kw1.forEach(r => console.log(`  → ${r.id} | ${r.name} | deleted: ${r.deleted_at || 'NO'}`));

  const kw2 = await sql`SELECT id, name, deleted_at FROM products WHERE LOWER(name) LIKE '%رمل أمريك%' OR LOWER(name) LIKE '%أمريكي%'`;
  console.log(`\n"رمل أمريكي": ${kw2.length} results`);
  kw2.forEach(r => console.log(`  → ${r.id} | ${r.name} | deleted: ${r.deleted_at || 'NO'}`));

  const kw3 = await sql`SELECT id, name, deleted_at FROM products WHERE id LIKE '%sand%' OR LOWER(name) LIKE '%رمل%'`;
  console.log(`\n"sand/رمل": ${kw3.length} results`);
  kw3.forEach(r => console.log(`  → ${r.id} | ${r.name} | deleted: ${r.deleted_at || 'NO'}`));

  // Check existing substrate products for reference
  console.log('\n=== Substrate/تربة products for reference ===');
  const subs = await sql`SELECT id, name, price, category, subcategory FROM products WHERE category = 'substrate' OR subcategory LIKE '%substrate%' OR LOWER(name) LIKE '%تربة%' LIMIT 5`;
  console.log(`Found: ${subs.length} substrate products`);
  subs.forEach(r => console.log(`  → ${r.id} | ${r.name} | ${r.price} IQD | ${r.category}/${r.subcategory}`));

  // Check if there are any local images
  console.log('\n=== Check local image folder ===');
}

main().catch(e => console.error(e));
