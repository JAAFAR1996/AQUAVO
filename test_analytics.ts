import 'dotenv/config';
import { getDb } from "./server/db.js";
import { orders, users, orderItems } from "./shared/schema.js";
import { sql, desc, gte, count, sum, eq, and } from "drizzle-orm";

async function testAnalytics() {
  try {
    console.log("Connecting to DB...");
    const db = getDb();
    if (!db) throw new Error("No DB");
    
    console.log("DB connected. Testing queries...");
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    console.log("Query 1: Orders in period");
    const ordersInPeriod = await db
      .select({
          totalOrders: count(),
          totalRevenue: sum(orders.total),
      })
      .from(orders)
      .where(gte(orders.createdAt, startDate));
    console.log("Query 1 result:", ordersInPeriod);

    console.log("Query 2: Daily sales");
    const dailySalesData = await db
      .select({
          date: sql<string>`(${orders.createdAt})::date::text`,
          revenue: sum(orders.total),
          orderCount: count(),
      })
      .from(orders)
      .where(gte(orders.createdAt, startDate))
      .groupBy(sql`(${orders.createdAt})::date`)
      .orderBy(sql`(${orders.createdAt})::date`);
    console.log("Query 2 result:", dailySalesData);

    console.log("Query 3: Top products");
    const topProductsSales = await db
            .select({
                productId: orderItems.productId,
                productName: orderItems.productName,
                totalQuantity: sum(orderItems.quantity),
                totalRevenue: sum(sql`${orderItems.price} * ${orderItems.quantity}`),
            })
            .from(orderItems)
            .innerJoin(orders, eq(orders.id, orderItems.orderId))
            .where(gte(orders.createdAt, startDate))
            .groupBy(orderItems.productId, orderItems.productName)
            .orderBy(desc(sum(orderItems.quantity)))
            .limit(10);
    console.log("Query 3 result", topProductsSales);

    console.log("Query 4: Status counts");
    const statusCounts = await db
            .select({
                status: orders.status,
                count: count(),
            })
            .from(orders)
            .groupBy(orders.status);
    console.log("Query 4 result:", statusCounts);

    console.log("Success! No crash.");
  } catch (err) {
    console.error("CRASH:", err);
  }
}

testAnalytics();
