/**
 * Reset Analytics & Orders — Keep only حوض شمتري 15x15x60
 * Order to KEEP: FW-260424-0001 (yee-c5-1123-2, Zain Emad)
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.production' }); // NOTE: no 'override' — an explicitly inherited DATABASE_URL must win (see server/db-target.ts)
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

const ORDER_TO_KEEP = 'FW-260424-0001';

async function main() {
  console.log('🧹 Starting analytics reset...\n');
  console.log(`📌 Keeping order: ${ORDER_TO_KEEP}\n`);

  // 1. Find the order ID to keep
  const [keepOrder] = await sql`
    SELECT id, order_number, total FROM orders WHERE order_number = ${ORDER_TO_KEEP}
  `;
  
  if (!keepOrder) {
    console.error(`❌ Order ${ORDER_TO_KEEP} not found!`);
    process.exit(1);
  }
  
  console.log(`✅ Found order to keep: ${keepOrder.order_number} (ID: ${keepOrder.id})`);

  // Get IDs of orders to delete
  const ordersToDelete = await sql`
    SELECT id, order_number FROM orders WHERE order_number != ${ORDER_TO_KEEP}
  `;
  const deleteIds = ordersToDelete.map(o => o.id);
  console.log(`📋 Orders to delete: ${ordersToDelete.map(o => o.order_number).join(', ')}`);

  if (deleteIds.length > 0) {
    // 2. Delete loyalty_transactions referencing these orders
    for (const oid of deleteIds) {
      await sql`DELETE FROM loyalty_transactions WHERE order_id = ${oid}`;
    }
    console.log(`🗑️  Deleted loyalty_transactions for removed orders`);

    // 3. Delete payments for orders we're removing
    for (const oid of deleteIds) {
      await sql`DELETE FROM payments WHERE order_id = ${oid}`;
    }
    console.log(`🗑️  Deleted payments for removed orders`);

    // 4. Delete order_items_relational for orders we're removing
    for (const oid of deleteIds) {
      await sql`DELETE FROM order_items_relational WHERE order_id = ${oid}`;
    }
    console.log(`🗑️  Deleted order items for removed orders`);

    // 5. Clear referrals that reference removed orders
    for (const oid of deleteIds) {
      await sql`UPDATE referrals SET first_order_id = NULL WHERE first_order_id = ${oid}`;
    }
    console.log(`🗑️  Cleared referral links to removed orders`);

    // 6. Delete the orders themselves
    for (const oid of deleteIds) {
      await sql`DELETE FROM orders WHERE id = ${oid}`;
    }
    console.log(`🗑️  Deleted ${deleteIds.length} orders (kept ${ORDER_TO_KEEP})`);
  }

  // 7. Clear ALL page_views
  await sql`TRUNCATE TABLE page_views`;
  console.log(`🗑️  Cleared page_views`);

  // 8. Clear ALL product_views
  await sql`TRUNCATE TABLE product_views`;
  console.log(`🗑️  Cleared product_views`);

  // 9. Clear ALL cart_sessions
  try {
    await sql`TRUNCATE TABLE cart_sessions`;
    console.log(`🗑️  Cleared cart_sessions`);
  } catch (e) {
    console.log(`⚠️  cart_sessions: ${(e as Error).message}`);
  }

  // 10. Clear product_interactions (browsing history)
  try {
    await sql`TRUNCATE TABLE product_interactions`;
    console.log(`🗑️  Cleared product_interactions`);
  } catch (e) {
    console.log(`⚠️  product_interactions: ${(e as Error).message}`);
  }

  // 11. Clear search_queries if exists
  try {
    await sql`TRUNCATE TABLE search_queries`;
    console.log(`🗑️  Cleared search_queries`);
  } catch (e) {
    // Table might not exist, ignore
  }

  // 12. Verify remaining data
  console.log('\n📊 Verification:');
  const [orderCount] = await sql`SELECT count(*) as c FROM orders`;
  const [pvCount] = await sql`SELECT count(*) as c FROM page_views`;
  const [prodViewCount] = await sql`SELECT count(*) as c FROM product_views`;
  
  console.log(`  Orders remaining: ${orderCount.c}`);
  console.log(`  Page views: ${pvCount.c}`);
  console.log(`  Product views: ${prodViewCount.c}`);

  // Show the kept order
  const [kept] = await sql`
    SELECT order_number, status, total, rounded_total, customer_name, customer_phone
    FROM orders WHERE order_number = ${ORDER_TO_KEEP}
  `;
  console.log(`\n✅ Kept order:`);
  console.log(`  #${kept.order_number} | ${kept.status} | ${kept.total} IQD | ${kept.customer_name} | ${kept.customer_phone}`);
  
  console.log('\n🎉 Reset complete!');
}

main().catch(console.error);
