import { neon } from '@neondatabase/serverless';
import fs from 'fs';
const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  // أولاً نشوف الـ variants الحالية
  const p = await sql`SELECT id, name, variants, images FROM products WHERE id = 'houyi-connectors-4mm'`;
  console.log("Current variants:", JSON.stringify(p[0].variants, null, 2));
  console.log("\nCurrent images:", JSON.stringify(p[0].images, null, 2));
  
  // ونشوف صور صمام التحكم
  const cv = await sql`SELECT id, name, images FROM products WHERE id = 'houyi-control-valve' OR id LIKE '%control-valve%'`;
  if (cv.length > 0) {
    console.log("\nControl valve product:", cv[0].id, cv[0].name);
    console.log("Control valve images:", JSON.stringify(cv[0].images, null, 2));
  }
  
  fs.writeFileSync('connectors-check.json', JSON.stringify({ connectors: p[0], controlValve: cv[0] }, null, 2));
}
main().catch(console.error);
