import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function check() {
  console.log('=== Checking 4 Products in NEON Database ===\n');

  const ids = [
    'houyi-control-valve-4mm',
    'houyi-control-valve',
    'houyi-oxygenation-tube',
    'houyi-acrylic-tool-rack',
    'houyi-tool-kit'
  ];

  for (const id of ids) {
    const result = await sql`SELECT id, name, price, stock, deleted_at FROM products WHERE id = ${id} OR slug = ${id}`;
    if (result.length > 0) {
      const r = result[0];
      console.log(`✅ FOUND: ${r.id}`);
      console.log(`   Name: ${r.name}`);
      console.log(`   Price: ${r.price} | Stock: ${r.stock} | Deleted: ${r.deleted_at || 'NO'}`);
      console.log('');
    } else {
      console.log(`❌ NOT FOUND: ${id}\n`);
    }
  }

  // Search by keywords
  console.log('--- Keyword Search ---');
  
  const kw1 = await sql`SELECT id, name, deleted_at FROM products WHERE LOWER(name) LIKE '%صمام تحكم%' OR id LIKE '%control-valve%'`;
  console.log(`\nControl Valve: ${kw1.length} results`);
  kw1.forEach(r => console.log(`  → ${r.id} | ${r.name} | deleted: ${r.deleted_at || 'NO'}`));

  const kw2 = await sql`SELECT id, name, deleted_at FROM products WHERE id LIKE '%oxygenation%' OR LOWER(name) LIKE '%أنبوب أكسجين%' OR LOWER(name) LIKE '%خرطوم هواء%'`;
  console.log(`\nOxygenation Tube: ${kw2.length} results`);
  kw2.forEach(r => console.log(`  → ${r.id} | ${r.name} | deleted: ${r.deleted_at || 'NO'}`));

  const kw3 = await sql`SELECT id, name, deleted_at FROM products WHERE id LIKE '%acrylic-tool-rack%' OR LOWER(name) LIKE '%حامل أدوات%' OR LOWER(name) LIKE '%رف أدوات%'`;
  console.log(`\nAcrylic Tool Rack: ${kw3.length} results`);
  kw3.forEach(r => console.log(`  → ${r.id} | ${r.name} | deleted: ${r.deleted_at || 'NO'}`));

  const kw4 = await sql`SELECT id, name, deleted_at FROM products WHERE id LIKE '%tool-kit%' OR LOWER(name) LIKE '%حقيبة أدوات%' OR LOWER(name) LIKE '%طقم أدوات%'`;
  console.log(`\nTool Kit: ${kw4.length} results`);
  kw4.forEach(r => console.log(`  → ${r.id} | ${r.name} | deleted: ${r.deleted_at || 'NO'}`));

  console.log('\n=== Done ===');
}

check().catch(e => console.error(e));
