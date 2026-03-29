import { neon } from '@neondatabase/serverless';
const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  // Get the heater product
  const heater = await sql`SELECT id, slug, name, images, thumbnail FROM products WHERE slug = 'c4-1117' OR id = 'c4-1117'`;
  console.log("=== Heater product ===");
  console.log(JSON.stringify(heater[0], null, 2));
  
  // Find sand washer product
  const washer = await sql`SELECT id, slug, name, images FROM products WHERE name LIKE '%sand%washer%' OR name LIKE '%غسال%رمل%' OR name LIKE '%مكناسة%'`;
  console.log("\n=== Sand Washer product ===");
  if (washer.length > 0) {
    console.log(JSON.stringify(washer[0], null, 2));
  } else {
    console.log("Not found by name");
  }
  
  // Search for products with 'sand' in images
  const sandImgs = await sql`SELECT id, name, images FROM products WHERE images::text LIKE '%sand%' LIMIT 5`;
  console.log("\n=== Products with 'sand' in images ===");
  for (const p of sandImgs) {
    console.log(`${p.id}: ${p.name}`);
    console.log(`  images: ${JSON.stringify(p.images)}`);
  }
  
  // Search for heater products to find right images
  const heaters = await sql`SELECT id, slug, name, images FROM products WHERE name LIKE '%سخان%' OR name LIKE '%heater%' OR id LIKE '%heater%' LIMIT 10`;
  console.log("\n=== All heater products ===");
  for (const h of heaters) {
    console.log(`${h.id} (slug: ${h.slug}): ${h.name}`);
    console.log(`  images: ${JSON.stringify(h.images)}`);
    console.log('---');
  }
}
main().then(() => process.exit(0)).catch(console.error);
