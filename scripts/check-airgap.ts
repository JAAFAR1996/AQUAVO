import { neon } from '@neondatabase/serverless';
const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  // Check hasVariants field
  const results = await sql`
    SELECT id, name, has_variants, 
           variants IS NOT NULL as has_variants_data,
           jsonb_array_length(COALESCE(variants, '[]'::jsonb)) as variant_count
    FROM products 
    WHERE id IN ('houyi-air-distributor', 'houyi-connectors-4mm', 'houyi-stainless-shunt')
    ORDER BY id
  `;
  
  for (const r of results) {
    console.log(`${r.id}:`);
    console.log(`  has_variants (bool): ${r.has_variants}`);
    console.log(`  variants data exists: ${r.has_variants_data}`);
    console.log(`  variant count: ${r.variant_count}`);
    console.log('---');
  }
}
main().catch(console.error);
