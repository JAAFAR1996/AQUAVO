import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  // Check existing products with variants
  const withVariants = await sql`
    SELECT id, name, variants, has_variants 
    FROM products 
    WHERE has_variants = true 
    LIMIT 3
  `;
  console.log(`Products with has_variants=true: ${withVariants.length}`);
  withVariants.forEach(p => {
    console.log(`\n--- ${p.id} ---`);
    console.log(`Name: ${p.name}`);
    console.log(`Variants: ${JSON.stringify(p.variants, null, 2)}`);
  });

  // Also check products with non-null variants
  const withVariantData = await sql`
    SELECT id, name, variants, has_variants 
    FROM products 
    WHERE variants IS NOT NULL AND variants::text != 'null' AND variants::text != '[]'
    LIMIT 5
  `;
  console.log(`\n\nProducts with variant data: ${withVariantData.length}`);
  withVariantData.forEach(p => {
    console.log(`\n--- ${p.id} ---`);
    console.log(`Name: ${p.name}`);
    console.log(`has_variants: ${p.has_variants}`);
    console.log(`Variants: ${JSON.stringify(p.variants, null, 2)}`);
  });
}

main().catch(e => console.error(e));
