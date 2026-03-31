import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  console.log('=== Checking both suction products ===\n');

  const results = await sql`
    SELECT id, name, slug, description, price, stock, images, thumbnail, 
           category, subcategory, specifications, deleted_at
    FROM products 
    WHERE id LIKE '%suction%' OR slug LIKE '%suction%'
    ORDER BY id
  `;

  for (const p of results) {
    console.log(`\n========== ${p.id} ==========`);
    console.log(`Name: ${p.name}`);
    console.log(`Slug: ${p.slug}`);
    console.log(`Price: ${p.price} | Stock: ${p.stock}`);
    console.log(`Category: ${p.category} / ${p.subcategory}`);
    console.log(`Description: ${p.description?.substring(0, 200)}`);
    console.log(`Specs: ${JSON.stringify(p.specifications)}`);
    console.log(`Images: ${JSON.stringify(p.images)}`);
    console.log(`Thumbnail: ${p.thumbnail}`);
    console.log(`Deleted: ${p.deleted_at || 'NO'}`);
  }
}

main().catch(e => console.error(e));
