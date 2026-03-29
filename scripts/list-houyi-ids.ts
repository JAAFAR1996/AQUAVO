import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  const products = await sql`
    SELECT id, name 
    FROM products 
    WHERE deleted_at IS NULL AND brand = 'Houyi'
    ORDER BY id
  `;
  for (const p of products) {
    console.log(`${p.id}  →  ${p.name}`);
  }
  console.log(`\nTotal: ${products.length}`);
}

main().catch(console.error);
