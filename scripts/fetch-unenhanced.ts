import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  const products = await sql`
    SELECT id, name, description, specifications 
    FROM products 
    WHERE deleted_at IS NULL 
    AND id IN (
      'houyi-5-in-1-cleaning-tool',
      'houyi-activated-carbon',
      'houyi-ceramic-ring',
      'houyi-water-changer-siphon',
      'houyi-inflatable-fish-bag',
      'houyi-wave-pump',
      'houyi-acrylic-pump-compartment',
      'houyi-led-light',
      'houyi-sucker-buckle'
    )
    ORDER BY id
  `;
  console.log(JSON.stringify(products, null, 2));
}

main().catch(console.error);
