import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  const products = await sql`SELECT id, name, slug, brand, category, price FROM products LIMIT 5`;
  console.log(JSON.stringify(products, null, 2));
}

main().catch(console.error);
