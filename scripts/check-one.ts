import { neon } from '@neondatabase/serverless';
const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  const rows = await sql`
    SELECT id, specifications 
    FROM products WHERE id = 'houyi-oxygenation-tube'
  `;
  console.log(JSON.stringify(rows[0].specifications, null, 2));
}
main().catch(console.error);
