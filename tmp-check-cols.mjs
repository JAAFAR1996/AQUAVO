import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

// Check what columns exist in products table
const cols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'products' ORDER BY ordinal_position`;
console.log('=== Product Table Columns ===');
for (const c of cols) {
  console.log(`  ${c.column_name} (${c.data_type})`);
}
