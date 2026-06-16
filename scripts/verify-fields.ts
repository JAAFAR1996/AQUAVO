import { neon } from '@neondatabase/serverless';
import fs from 'fs';
const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  const products = await sql`
    SELECT id,
      CASE WHEN specifications->'benefits' IS NOT NULL THEN 'Y' ELSE 'N' END as b,
      CASE WHEN specifications->'usageInstructions' IS NOT NULL THEN 'Y' ELSE 'N' END as u,
      CASE WHEN specifications->'safetyWarnings' IS NOT NULL THEN 'Y' ELSE 'N' END as s
    FROM products 
    WHERE deleted_at IS NULL AND brand = 'Houyi'
    AND (specifications->'benefits' IS NULL 
      OR specifications->'usageInstructions' IS NULL 
      OR specifications->'safetyWarnings' IS NULL)
    ORDER BY id
  `;
  
  let output = 'Missing fields:\n';
  for (const p of products) {
    output += `${p.id} | ben:${p.b} usg:${p.u} saf:${p.s}\n`;
  }
  output += `\nTotal missing: ${products.length}\n`;
  fs.writeFileSync('missing-fields.txt', output);
  console.log(output);
}
main().catch(console.error);
