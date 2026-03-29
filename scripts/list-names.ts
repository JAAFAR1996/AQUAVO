import { neon } from '@neondatabase/serverless';
import fs from 'fs';
const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  const products = await sql`
    SELECT id, name, category, subcategory
    FROM products 
    WHERE deleted_at IS NULL AND brand = 'Houyi'
    ORDER BY category, subcategory, id
  `;
  
  let output = '';
  for (const p of products) {
    output += `${p.id} | ${p.category}/${p.subcategory} | ${p.name}\n`;
  }
  fs.writeFileSync('all-names.txt', output);
  console.log(output);
  console.log(`Total: ${products.length}`);
}
main().catch(console.error);
