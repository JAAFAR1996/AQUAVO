import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  console.log('=== Searching for existing siphon/water change products ===\n');

  const kw1 = await sql`SELECT id, name, deleted_at FROM products WHERE LOWER(id) LIKE '%siphon%' OR LOWER(id) LIKE '%water-change%' OR LOWER(id) LIKE '%c5-1144%' OR LOWER(id) LIKE '%3621%'`;
  console.log(`"siphon/water-change/c5-1144/3621" by ID: ${kw1.length}`);
  kw1.forEach(r => console.log(`  → ${r.id} | ${r.name} | deleted: ${r.deleted_at || 'NO'}`));

  const kw2 = await sql`SELECT id, name, deleted_at FROM products WHERE LOWER(name) LIKE '%سيفون%' OR LOWER(name) LIKE '%تغيير ماء%' OR LOWER(name) LIKE '%شفط ماء%' OR LOWER(name) LIKE '%تفريغ%'`;
  console.log(`\n"سيفون/تغيير ماء/شفط" by name: ${kw2.length}`);
  kw2.forEach(r => console.log(`  → ${r.id} | ${r.name} | deleted: ${r.deleted_at || 'NO'}`));

  const kw3 = await sql`SELECT id, name, deleted_at FROM products WHERE LOWER(id) LIKE '%water%' OR LOWER(name) LIKE '%ماء%'`;
  console.log(`\n"water/ماء" broader: ${kw3.length}`);
  kw3.forEach(r => console.log(`  → ${r.id} | ${r.name} | deleted: ${r.deleted_at || 'NO'}`));
}

main().catch(e => console.error(e));
