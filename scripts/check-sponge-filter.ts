import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  console.log('=== Checking sponge filter product ===\n');

  const result = await sql`
    SELECT id, name, slug, price, stock, specifications, variants, has_variants,
           category, subcategory, images, thumbnail, deleted_at
    FROM products 
    WHERE slug = 'general-sponge-filter-xy180' OR id LIKE '%sponge%' OR id LIKE '%xy180%' OR id LIKE '%xy-180%'
  `;

  if (result.length > 0) {
    for (const p of result) {
      console.log(`ID: ${p.id}`);
      console.log(`Name: ${p.name}`);
      console.log(`Price: ${p.price} IQD | Stock: ${p.stock}`);
      console.log(`Category: ${p.category}/${p.subcategory}`);
      console.log(`Has Variants: ${p.has_variants}`);
      console.log(`Variants: ${JSON.stringify(p.variants)}`);
      console.log(`Deleted: ${p.deleted_at || 'NO'}\n`);
    }
  } else {
    console.log('Not found by ID, trying broader search...');
    const search = await sql`SELECT id, name, slug FROM products WHERE LOWER(name) LIKE '%إسفنج%' OR LOWER(name) LIKE '%sponge%' OR LOWER(slug) LIKE '%sponge%'`;
    console.log(`Broader: ${search.length} results`);
    search.forEach(r => console.log(`  → ${r.id} | ${r.name} | slug: ${r.slug}`));
  }
}

main().catch(e => console.error(e));
