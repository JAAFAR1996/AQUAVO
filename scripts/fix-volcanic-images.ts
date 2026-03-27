import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require' });

async function main() {
  const newImages = [
    "/images/products/houyi/houyi-volcanic-stone/H67404d2e051b45be84245885ac0dec6cd.jpg",
    "/images/products/houyi/houyi-volcanic-stone/H27409824026c48c0adac66cbe147411c9.jpg"
  ];
  const newThumbnail = newImages[0]; // The one showing both black & red

  const result = await pool.query(
    `UPDATE products SET images = $1::jsonb, thumbnail = $2, updated_at = NOW() WHERE id = 'houyi-volcanic-stone' RETURNING id, name, thumbnail, images`,
    [JSON.stringify(newImages), newThumbnail]
  );

  console.log('✅ Updated:', JSON.stringify(result.rows[0], null, 2));
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
