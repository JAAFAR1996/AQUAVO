import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  try {
    const products = await sql`
      SELECT id, name, stock, price, brand, category 
      FROM products 
      WHERE deleted_at IS NULL 
      ORDER BY name
    `;
    
    console.log(`\n=== Total Products: ${products.length} ===\n`);
    
    for (const p of products) {
      console.log(`ID: ${p.id} | Name: ${p.name} | Stock: ${p.stock} | Price: ${p.price} | Brand: ${p.brand} | Category: ${p.category}`);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
