import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;
const DB = "postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";

async function main() {
  const pool = new Pool({ connectionString: DB });
  const r = await pool.query("SELECT id, brand, category, subcategory, thumbnail FROM products WHERE category IN ('decor','rock') ORDER BY id");
  for (const row of r.rows) console.log(JSON.stringify(row));
  await pool.end();
}

main();
