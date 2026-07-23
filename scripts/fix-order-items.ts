/**
 * Fix: Populate order_items_relational from orders.items JSON
 * This ensures the "top products" analytics chart works correctly
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.production' }); // NOTE: no 'override' — an explicitly inherited DATABASE_URL must win (see server/db-target.ts)
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function fix() {
  console.log('🔧 Fixing order_items_relational...\n');

  // Get all orders with their JSON items
  const orders = await sql`SELECT id, order_number, items FROM orders`;

  for (const order of orders) {
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    if (!items || !Array.isArray(items)) continue;

    for (const item of items) {
      // Check if already exists
      const existing = await sql`
        SELECT id FROM order_items_relational 
        WHERE order_id = ${order.id} AND product_id = ${item.productId}
      `;
      
      if (existing.length === 0) {
        const totalPrice = Number(item.priceAtPurchase) * Number(item.quantity);
        await sql`
          INSERT INTO order_items_relational (order_id, product_id, quantity, price_at_purchase, total_price)
          VALUES (${order.id}, ${item.productId}, ${item.quantity}, ${item.priceAtPurchase}, ${totalPrice})
        `;
        console.log(`  ✅ Added: ${item.productId} × ${item.quantity} to order ${order.order_number}`);
      } else {
        console.log(`  ⏩ Already exists: ${item.productId} in order ${order.order_number}`);
      }
    }
  }

  // Verify
  const [count] = await sql`SELECT count(*) as c FROM order_items_relational`;
  console.log(`\n📋 order_items_relational now has: ${count.c} rows`);
  
  console.log('\n🎉 Fix complete!');
}

fix().catch(console.error);
