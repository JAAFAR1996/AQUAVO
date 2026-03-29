import { neon } from '@neondatabase/serverless';
import fs from 'fs';
const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  // صور منتج الكوي نت الحالي
  const koi = await sql`SELECT id, name, images FROM products WHERE id = 'houyi-koi-fish-net'`;
  
  // كل منتجات الشبكات لنشوف الصور
  const nets = await sql`
    SELECT id, name, images 
    FROM products 
    WHERE deleted_at IS NULL 
    AND (id LIKE '%net%' OR id LIKE '%fish%' OR id LIKE '%mesh%')
    ORDER BY id
  `;
  
  // كل المنتجات اللي عندها صور فيها "koi" أو "aluminum" أو "retract"
  const all = await sql`
    SELECT id, name, images 
    FROM products 
    WHERE deleted_at IS NULL AND brand = 'Houyi'
    ORDER BY id
  `;
  
  let output = "=== Koi Fish Net Current ===\n";
  output += JSON.stringify(koi[0], null, 2) + "\n\n";
  
  output += "=== All Nets ===\n";
  for (const p of nets) {
    output += `${p.id}: ${JSON.stringify(p.images)}\n`;
  }
  
  output += "\n=== All Houyi Image Paths ===\n";
  const allPaths = new Set<string>();
  for (const p of all) {
    if (Array.isArray(p.images)) {
      for (const img of p.images) {
        // extract folder name
        const match = (img as string).match(/houyi\/([^\/]+)\//);
        if (match) allPaths.add(match[1]);
      }
    }
    output += `${p.id}: ${JSON.stringify(p.images)}\n`;
  }
  
  output += "\n=== Unique Image Folders ===\n";
  for (const path of [...allPaths].sort()) {
    output += path + "\n";
  }
  
  fs.writeFileSync('koi-check.txt', output, 'utf8');
  console.log("Saved to koi-check.txt");
}
main().catch(console.error);
