import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

const rows = await sql`SELECT id, name, slug, brand, category, substring(description, 1, 200) as desc_preview FROM products WHERE deleted_at IS NULL ORDER BY brand, name`;

console.log(`Total products: ${rows.length}\n`);
for (const r of rows) {
  console.log(`[${r.brand}] ${r.name}`);
  console.log(`  slug: ${r.slug} | category: ${r.category}`);
  console.log(`  desc: ${r.desc_preview}`);
  console.log('---');
}
