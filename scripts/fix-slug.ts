import { neon } from '@neondatabase/serverless';
const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');
async function main() {
  await sql`UPDATE products SET slug = 'yee-c5-1144-1a' WHERE id = 'yee-c5-1144-1a'`;
  console.log('✅ Slug fixed!');
  const r = await sql`SELECT id, slug FROM products WHERE id IN ('yee-c5-1144-1a','yee-3621')`;
  r.forEach(p => console.log(`${p.id} → slug: ${p.slug}`));
}
main();
