import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function check() {
  const p = await sql`SELECT id, name, status, stock FROM products WHERE id IN ('general-sponge-filter-xy180', 'general-air-stone')`;
  console.log(p);
}
check().catch(console.error);
