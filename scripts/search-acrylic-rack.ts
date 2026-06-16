import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  console.log('=== Searching for Acrylic Tool Rack ===\n');

  // Search by various keywords
  const kw1 = await sql`SELECT id, name, deleted_at FROM products WHERE LOWER(id) LIKE '%acrylic%' OR LOWER(id) LIKE '%tool-rack%' OR LOWER(id) LIKE '%tool-shelf%'`;
  console.log(`"acrylic/tool-rack/tool-shelf" by ID: ${kw1.length} results`);
  kw1.forEach(r => console.log(`  → ${r.id} | ${r.name} | deleted: ${r.deleted_at || 'NO'}`));

  const kw2 = await sql`SELECT id, name, deleted_at FROM products WHERE LOWER(name) LIKE '%أكريليك%' OR LOWER(name) LIKE '%حامل أدوات%' OR LOWER(name) LIKE '%رف أدوات%' OR LOWER(name) LIKE '%tool rack%'`;
  console.log(`\n"أكريليك/حامل أدوات" by name: ${kw2.length} results`);
  kw2.forEach(r => console.log(`  → ${r.id} | ${r.name} | deleted: ${r.deleted_at || 'NO'}`));

  const kw3 = await sql`SELECT id, name, deleted_at FROM products WHERE LOWER(id) LIKE '%rack%' OR LOWER(id) LIKE '%shelf%' OR LOWER(id) LIKE '%holder%'`;
  console.log(`\n"rack/shelf/holder" by ID: ${kw3.length} results`);
  kw3.forEach(r => console.log(`  → ${r.id} | ${r.name} | deleted: ${r.deleted_at || 'NO'}`));
}

main().catch(e => console.error(e));
