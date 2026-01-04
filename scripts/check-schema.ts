import { neon } from '@neondatabase/serverless';
const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

async function main() {
  const columns = await sql`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'products'
    ORDER BY ordinal_position
  `;
  console.log('=== PRODUCTS TABLE COLUMNS ===');
  columns.forEach((c: any) => console.log(`${c.column_name}: ${c.data_type}`));

  // Get one product as example
  const sample = await sql`SELECT * FROM products LIMIT 1`;
  console.log('\n=== SAMPLE PRODUCT ===');
  console.log(JSON.stringify(sample[0], null, 2));
}

main().catch(console.error);
