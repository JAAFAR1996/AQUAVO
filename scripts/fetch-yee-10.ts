import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  const total = await sql`SELECT COUNT(*)::int as c FROM products WHERE brand = 'HOYIA' AND deleted_at IS NULL`;
  console.log(`Total HOYIA products: ${total[0].c}\n`);

  const products = await sql`
    SELECT id, slug, name, brand, category, subcategory, description, price, specifications 
    FROM products 
    WHERE brand = 'HOYIA' AND deleted_at IS NULL 
    ORDER BY created_at ASC
  `;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    console.log(`--- Product ${i + 1} ---`);
    console.log(`ID: ${p.id}`);
    console.log(`Slug: ${p.slug}`);
    console.log(`Name: ${p.name}`);
    console.log(`Category: ${p.category} / ${p.subcategory}`);
    console.log(`Price: ${p.price}`);
    console.log(`EnglishName: ${p.specifications?.englishName || 'N/A'}`);
    console.log(`Description: ${(p.description || '').substring(0, 80)}...`);
    console.log();
  }
}

main().catch(console.error);
