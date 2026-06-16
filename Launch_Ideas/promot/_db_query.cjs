const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  const products = await sql("SELECT id, name, brand, category, subcategory, description, price, currency, stock, specifications FROM products ORDER BY id ASC LIMIT 7");
  
  // Write to file instead of console
  const output = products.map((p, i) => {
    return `
=== PRODUCT ${i+1} ===
ID: ${p.id}
Name: ${p.name}
Brand: ${p.brand}
Category: ${p.category}
Subcategory: ${p.subcategory}
Price: ${p.price} ${p.currency}
Stock: ${p.stock}
Description: ${p.description}
Specifications: ${JSON.stringify(p.specifications, null, 2)}
`;
  }).join('\n---\n');
  
  fs.writeFileSync('Launch_Ideas/promot/_products_output.txt', output, 'utf8');
  console.log('Done! Written to _products_output.txt');
  console.log(`Found ${products.length} products`);
}

main().catch(console.error);
