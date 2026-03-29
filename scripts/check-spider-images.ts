import { neon } from '@neondatabase/serverless';
import fs from 'fs';
const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  const spiders = await sql`
    SELECT id, name, price, stock, images, description, specifications
    FROM products WHERE deleted_at IS NULL AND id LIKE 'houyi-spider-wood%' ORDER BY id
  `;
  
  for (const p of spiders) {
    console.log(`\n=== ${p.id} ===`);
    console.log(`Name: ${p.name}`);
    console.log(`Price: ${p.price}`);
    console.log(`Stock: ${p.stock}`);
    console.log(`Images: ${JSON.stringify(p.images)}`);
  }
}
main().catch(console.error);
