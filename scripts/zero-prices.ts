import { neon } from '@neondatabase/serverless';
const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function zeroPrices() {
  console.log('Zeroing out prices for non-YEE / non-GENERAL products...');
  
  // Update price and original_price on main product table
  const updatedProducts = await sql`
    UPDATE products
    SET price = '0',
        original_price = NULL,
        updated_at = NOW()
    WHERE upper(brand) NOT IN ('YEE', 'GENERAL')
    RETURNING id, name, brand;
  `;
  
  console.log(`Updated ${updatedProducts.length} parent products.`);
  for (const p of updatedProducts) {
    console.log(` - ${p.brand}: ${p.name}`);
  }
  
  // Zero out variant prices if any exist
  const productsWithVariants = await sql`
    SELECT id, variants FROM products 
    WHERE upper(brand) NOT IN ('YEE', 'GENERAL') AND has_variants = true
  `;
  
  let variantUpdates = 0;
  for (const p of productsWithVariants) {
    if (p.variants) {
      const vars = (p.variants as any[]).map((v: any) => {
        const newV = { ...v, price: 0 };
        delete newV.originalPrice; // Remove original price
        return newV;
      });
      
      await sql`
        UPDATE products 
        SET variants = ${JSON.stringify(vars)}::jsonb 
        WHERE id = ${p.id}
      `;
      variantUpdates++;
    }
  }
  
  console.log(`\nUpdated variants for ${variantUpdates} products.`);
  console.log('Done!');
}
zeroPrices().catch(console.error);
