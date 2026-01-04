import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

async function main() {
  const products = await sql`
    SELECT slug, name, description, specifications
    FROM products
    WHERE slug LIKE 'houyi-%'
    ORDER BY slug
  `;

  console.log('=== HOUYI PRODUCTS ANALYSIS ===\n');

  // Categorize by description length
  const short: any[] = [];
  const medium: any[] = [];
  const detailed: any[] = [];

  for (const p of products) {
    const descLen = p.description?.length || 0;
    const specsCount = Object.keys(p.specifications || {}).length;

    if (descLen < 80 || specsCount < 4) {
      short.push({ ...p, descLen, specsCount });
    } else if (descLen < 150 || specsCount < 6) {
      medium.push({ ...p, descLen, specsCount });
    } else {
      detailed.push({ ...p, descLen, specsCount });
    }
  }

  console.log(`Total: ${products.length}`);
  console.log(`Detailed (good): ${detailed.length}`);
  console.log(`Medium: ${medium.length}`);
  console.log(`Short (needs improvement): ${short.length}`);

  if (short.length > 0) {
    console.log('\n=== PRODUCTS NEEDING IMPROVEMENT ===\n');
    for (const p of short) {
      console.log(`${p.slug}`);
      console.log(`  Name: ${p.name}`);
      console.log(`  Desc (${p.descLen} chars): ${p.description?.substring(0, 80)}...`);
      console.log(`  Specs (${p.specsCount} keys): ${JSON.stringify(p.specifications)}`);
      console.log('');
    }
  }
}

main().catch(console.error);
