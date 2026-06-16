import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  // 1. Get current variant data
  const [product] = await sql`SELECT id, name, stock, variants, has_variants FROM products WHERE id = 'yee-07509'`;
  
  console.log('=== BEFORE ===');
  console.log(`Product: ${product.name}`);
  console.log(`Main stock: ${product.stock}`);
  console.log(`Has variants: ${product.has_variants}`);
  console.log('Variants:', JSON.stringify(product.variants, null, 2));

  // 2. Update Fine15 variant stock to 18
  const variants = product.variants || [];
  for (const v of variants) {
    if (v.id === 'Fine15' || v.id === 'fine15' || v.label?.includes('1.5')) {
      console.log(`\nFound variant: ${v.id} / ${v.label} — stock ${v.stock} → 18`);
      v.stock = 18;
    }
  }

  // 3. Save updated variants
  await sql`
    UPDATE products 
    SET variants = ${JSON.stringify(variants)}::jsonb, 
        stock = 18,
        updated_at = NOW() 
    WHERE id = 'yee-07509'
  `;

  // 4. Verify
  const [after] = await sql`SELECT id, name, stock, variants FROM products WHERE id = 'yee-07509'`;
  console.log('\n=== AFTER ===');
  console.log(`Main stock: ${after.stock}`);
  console.log('Variants:', JSON.stringify(after.variants, null, 2));
  console.log('\n✅ Done!');
}

main().catch(e => console.error('Error:', e.message));
