import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  const result = await sql`
    SELECT id, slug, name, deleted_at, category, subcategory
    FROM products WHERE id IN ('yee-c5-1144-1a', 'yee-3621')
  `;
  result.forEach(p => {
    console.log(`ID: ${p.id}`);
    console.log(`Slug: ${p.slug}`);
    console.log(`Name: ${p.name}`);
    console.log(`Category: ${p.category}/${p.subcategory}`);
    console.log(`Deleted: ${p.deleted_at || 'NO'}\n`);
  });
}

main().catch(e => console.error(e));
