import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  console.log('=== Searching for pipe clamp/holder products ===\n');

  const kw1 = await sql`SELECT id, name, deleted_at FROM products WHERE LOWER(id) LIKE '%pipe%' OR LOWER(id) LIKE '%clamp%' OR LOWER(id) LIKE '%fix%'`;
  console.log(`"pipe/clamp/fix" by ID: ${kw1.length} results`);
  kw1.forEach(r => console.log(`  → ${r.id} | ${r.name} | deleted: ${r.deleted_at || 'NO'}`));

  const kw2 = await sql`SELECT id, name, deleted_at FROM products WHERE LOWER(name) LIKE '%أنبوب%' OR LOWER(name) LIKE '%ماسك%' OR LOWER(name) LIKE '%مثبت%' OR LOWER(name) LIKE '%pipe%'`;
  console.log(`\n"أنبوب/ماسك/مثبت/pipe" by name: ${kw2.length} results`);
  kw2.forEach(r => console.log(`  → ${r.id} | ${r.name} | deleted: ${r.deleted_at || 'NO'}`));

  // Also search for anything with "acrylic" that might be this
  const kw3 = await sql`SELECT id, name, deleted_at FROM products WHERE LOWER(id) LIKE '%acrylic%'`;
  console.log(`\nAll "acrylic" products: ${kw3.length} results`);
  kw3.forEach(r => console.log(`  → ${r.id} | ${r.name} | deleted: ${r.deleted_at || 'NO'}`));

  // Check for existing images folder
  console.log('\n=== Note: Need to check if images exist for this new product ===');
}

main().catch(e => console.error(e));
