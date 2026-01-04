import { neon } from '@neondatabase/serverless';
const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

async function main() {
  const categories = await sql`SELECT id, name, slug FROM categories ORDER BY name`;
  console.log('=== CATEGORIES ===');
  categories.forEach((c: any) => console.log(`${c.id}: ${c.name} (${c.slug})`));
}

main().catch(console.error);
