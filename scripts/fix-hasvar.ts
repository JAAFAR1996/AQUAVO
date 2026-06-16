import { neon } from '@neondatabase/serverless';
const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  await sql`UPDATE products SET has_variants = true, updated_at = NOW() WHERE id = 'houyi-air-distributor'`;
  const r = await sql`SELECT id, has_variants, jsonb_array_length(variants) as cnt FROM products WHERE id = 'houyi-air-distributor'`;
  console.log('Updated:', JSON.stringify(r[0]));
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
