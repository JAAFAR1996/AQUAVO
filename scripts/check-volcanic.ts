import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require' });

async function main() {
  const result = await pool.query(`SELECT id, name, thumbnail, images FROM products WHERE id = 'houyi-volcanic-stone'`);
  console.log('Product:', JSON.stringify(result.rows[0], null, 2));
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
