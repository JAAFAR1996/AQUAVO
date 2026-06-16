import { neon } from '@neondatabase/serverless';
const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  // Check sinking wood products
  const results = await sql`
    SELECT id, slug, name, price, description, category, specifications, images, variants, has_variants
    FROM products 
    WHERE slug LIKE '%sinking-wood%' OR id LIKE '%sinking-wood%' OR id LIKE '%mountain%'
    ORDER BY id
  `;
  
  for (const r of results) {
    console.log(`ID: ${r.id}`);
    console.log(`  slug: ${r.slug}`);
    console.log(`  name: ${r.name}`);
    console.log(`  price: ${r.price}`);
    console.log(`  category: ${r.category}`);
    console.log(`  description: ${r.description?.substring(0, 200)}`);
    console.log(`  images: ${JSON.stringify(r.images)}`);
    console.log(`  has_variants: ${r.has_variants}`);
    console.log(`  variants: ${r.variants ? JSON.stringify(r.variants).substring(0, 200) : 'null'}`);
    console.log(`  specs: ${r.specifications ? JSON.stringify(r.specifications).substring(0, 300) : 'null'}`);
    console.log('===');
  }
}
main().then(() => process.exit(0)).catch(console.error);
