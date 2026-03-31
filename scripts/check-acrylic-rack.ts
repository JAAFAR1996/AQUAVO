import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  console.log('=== Full details: houyi-acrylic-tool-rack ===\n');

  const result = await sql`
    SELECT id, name, slug, description, price, stock, images, thumbnail, 
           category, subcategory, specifications, deleted_at
    FROM products 
    WHERE id = 'houyi-acrylic-tool-rack'
  `;

  if (result.length > 0) {
    const p = result[0];
    console.log(`ID: ${p.id}`);
    console.log(`Name: ${p.name}`);
    console.log(`Slug: ${p.slug}`);
    console.log(`Price: ${p.price} IQD`);
    console.log(`Stock: ${p.stock}`);
    console.log(`Category: ${p.category} / ${p.subcategory}`);
    console.log(`Description: ${p.description}`);
    console.log(`Specs: ${JSON.stringify(p.specifications, null, 2)}`);
    console.log(`Thumbnail: ${p.thumbnail}`);
    console.log(`Images: ${JSON.stringify(p.images, null, 2)}`);
    console.log(`Deleted: ${p.deleted_at || 'NO'}`);
  }
}

main().catch(e => console.error(e));
