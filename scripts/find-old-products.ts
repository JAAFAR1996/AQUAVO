import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  console.log("Checking oldest products to see if they survived...");
  const oldProducts = await sql`
    SELECT id, slug, name, brand, category, created_at, updated_at
    FROM products
    ORDER BY created_at ASC
    LIMIT 20
  `;
  
  console.log("Oldest 20 products:");
  console.table(oldProducts);

  const uuidIDs = await sql`
    SELECT count(*) as cnt FROM products WHERE id LIKE '%-%-%-%-%' AND length(id) = 36
  `;
  console.log(`Products with UUID IDs: ${uuidIDs[0].cnt}`);

  const oldButUUID = await sql`
    SELECT count(*) as cnt FROM products 
    WHERE id LIKE '%-%-%-%-%' AND length(id) = 36
    AND created_at < '2026-03-01'
  `;
  console.log(`Products created before March 2026 that have UUID IDs: ${oldButUUID[0].cnt}`);
}

main().catch(console.error);
