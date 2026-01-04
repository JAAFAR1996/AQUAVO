import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

async function main() {
  const products = await sql`SELECT id, name, slug FROM products ORDER BY slug`;
  console.log('=== ALL DATABASE PRODUCTS ===');
  console.log(`Total: ${products.length}`);
  console.log();
  products.forEach((p: any, i: number) => {
    console.log(`${i+1}. ${p.slug}`);
  });
}

main().catch(console.error);
