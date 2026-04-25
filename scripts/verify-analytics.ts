/**
 * Deep verification of all analytics numbers
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.production', override: true });
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function verify() {
  console.log('🔍 DEEP ANALYTICS VERIFICATION\n');

  // 1. Orders
  const orders = await sql`SELECT id, order_number, total, rounded_total, status, created_at, customer_name FROM orders`;
  console.log(`📦 ORDERS (${orders.length}):`);
  for (const o of orders) {
    console.log(`  ${o.order_number} | total=${o.total} | rounded=${o.rounded_total} | status=${o.status} | ${o.customer_name}`);
  }

  // 2. Revenue calculation (what analytics.ts does)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const [revenue] = await sql`
    SELECT count(*) as order_count, COALESCE(sum(total), 0) as total_revenue
    FROM orders WHERE created_at >= ${thirtyDaysAgo}
  `;
  console.log(`\n💰 REVENUE (last 30 days):`);
  console.log(`  Order count: ${revenue.order_count}`);
  console.log(`  Total revenue: ${revenue.total_revenue}`);
  console.log(`  Average order value: ${Number(revenue.order_count) > 0 ? Number(revenue.total_revenue) / Number(revenue.order_count) : 0}`);

  // 3. Customers
  const [customers] = await sql`SELECT count(*) as c FROM users WHERE role = 'user'`;
  console.log(`\n👥 CUSTOMERS: ${customers.c}`);

  // 4. Product Views (what analytics uses for "page views")
  const [prodViews] = await sql`SELECT count(*) as c FROM product_views`;
  console.log(`\n👁️ PRODUCT_VIEWS table: ${prodViews.c}`);

  // 5. Page Views (visitor tracking)
  const [pageViews] = await sql`SELECT count(*) as c FROM page_views`;
  console.log(`📄 PAGE_VIEWS table: ${pageViews.c}`);

  // 6. Cart Sessions
  const [cartSessions] = await sql`SELECT count(*) as c FROM cart_sessions`;
  console.log(`🛒 CART_SESSIONS: ${cartSessions.c}`);

  // 7. Conversion rate calculation
  const convRate = Number(cartSessions.c) > 0 
    ? (Number(revenue.order_count) / Number(cartSessions.c)) * 100 
    : 0;
  console.log(`📊 CONVERSION RATE: ${convRate}%`);

  // 8. Order items (relational)
  const [orderItems] = await sql`SELECT count(*) as c FROM order_items_relational`;
  console.log(`\n📋 ORDER_ITEMS_RELATIONAL: ${orderItems.c}`);

  // 9. Check if order items exist in JSON format
  const orderItemsJson = await sql`
    SELECT order_number, items FROM orders
  `;
  for (const o of orderItemsJson) {
    const items = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
    console.log(`  ${o.order_number} items JSON: ${JSON.stringify(items)}`);
  }

  // 10. Product interactions
  const [interactions] = await sql`SELECT count(*) as c FROM product_interactions`;
  console.log(`\n🤝 PRODUCT_INTERACTIONS: ${interactions.c}`);

  // 11. Search queries
  const [searches] = await sql`SELECT count(*) as c FROM search_queries`;
  console.log(`🔎 SEARCH_QUERIES: ${searches.c}`);

  // 12. Loyalty transactions remaining
  const [loyalty] = await sql`SELECT count(*) as c FROM loyalty_transactions`;
  console.log(`🎖️ LOYALTY_TRANSACTIONS: ${loyalty.c}`);

  console.log('\n✅ Verification complete');
}

verify().catch(console.error);
