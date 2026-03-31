import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  // Check existing deleted product
  console.log('=== yee-c5-1144-1a (DELETED) ===\n');
  const r1 = await sql`SELECT * FROM products WHERE id = 'yee-c5-1144-1a'`;
  if (r1.length > 0) {
    const p = r1[0];
    console.log(`Name: ${p.name}`);
    console.log(`Price: ${p.price} | Stock: ${p.stock}`);
    console.log(`Category: ${p.category}/${p.subcategory}`);
    console.log(`Description: ${p.description?.substring(0, 300)}`);
    console.log(`Images: ${JSON.stringify(p.images)}`);
    console.log(`Thumbnail: ${p.thumbnail}`);
  }

  // Check houyi-water-changer-siphon
  console.log('\n=== houyi-water-changer-siphon (ACTIVE) ===\n');
  const r2 = await sql`SELECT * FROM products WHERE id = 'houyi-water-changer-siphon'`;
  if (r2.length > 0) {
    const p = r2[0];
    console.log(`Name: ${p.name}`);
    console.log(`Price: ${p.price} | Stock: ${p.stock}`);
    console.log(`Category: ${p.category}/${p.subcategory}`);
    console.log(`Description: ${p.description?.substring(0, 300)}`);
    console.log(`Images: ${JSON.stringify(p.images)}`);
  }

  // Check if YEE-3621 exists anywhere
  console.log('\n=== Search for YEE-3621 ===');
  const r3 = await sql`SELECT id, name, deleted_at FROM products WHERE LOWER(id) LIKE '%3621%' OR LOWER(name) LIKE '%3621%'`;
  console.log(`Found: ${r3.length}`);
  r3.forEach(r => console.log(`  → ${r.id} | ${r.name} | deleted: ${r.deleted_at || 'NO'}`));
}

main().catch(e => console.error(e));
