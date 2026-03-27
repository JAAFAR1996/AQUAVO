import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  // Check existing HOUYI products
  const existing = await sql`SELECT COUNT(*)::int as c FROM products WHERE brand = 'HOUYI' AND deleted_at IS NULL`;
  console.log(`Existing HOUYI products in DB: ${existing[0].c}`);

  if (existing[0].c > 0) {
    const list = await sql`SELECT id, slug, name FROM products WHERE brand = 'HOUYI' AND deleted_at IS NULL ORDER BY created_at`;
    list.forEach((p: any, i: number) => console.log(`  ${i+1}. ${p.id} | ${p.slug} | ${p.name}`));
  }

  // Check all brands
  const brands = await sql`SELECT brand, COUNT(*)::int as c FROM products WHERE deleted_at IS NULL GROUP BY brand ORDER BY c DESC`;
  console.log('\nAll brands in DB:');
  brands.forEach((b: any) => console.log(`  ${b.brand}: ${b.c} products`));
}

main().catch(console.error);
