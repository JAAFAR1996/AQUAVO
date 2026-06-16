import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  console.log("Checking audit_logs...");
  const logsCount = await sql`SELECT count(*) as cnt FROM audit_logs WHERE entity_type = 'product'`;
  console.log(`Product audit logs: ${logsCount[0].cnt}`);

  const deleteLogs = await sql`SELECT count(*) as cnt FROM audit_logs WHERE entity_type = 'product' AND action = 'delete'`;
  console.log(`Product delete logs: ${deleteLogs[0].cnt}`);

  if (logsCount[0].cnt > 0) {
    const recent = await sql`SELECT action, entity_id, created_at, changes FROM audit_logs WHERE entity_type = 'product' ORDER BY created_at DESC LIMIT 5`;
    console.log("Recent product changes:", JSON.stringify(recent, null, 2));
  }

  const prodCount = await sql`SELECT min(created_at) as min_cre, max(created_at) as max_cre, min(updated_at) as min_upd, max(updated_at) as max_upd FROM products`;
  console.log("Current product timestamps:", JSON.stringify(prodCount, null, 2));
}

main().catch(console.error);
