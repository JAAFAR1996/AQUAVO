/**
 * Fix malformed order numbers in the database
 * Converts old UUID/random-based order numbers to proper FH-YYMMDD-XXXX format
 * Run: npx tsx scripts/fix-order-numbers.ts
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';

// Try production env first, fallback to .env
dotenv.config({ path: '.env.production' });
if (!process.env.DATABASE_URL) dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL is not set');
  process.exit(1);
}

const client = neon(connectionString);
const db = drizzle(client);

async function fixOrderNumbers() {
  console.log('🔍 Looking for malformed order numbers...\n');

  // Find all orders where order_number doesn't match FH-YYMMDD-XXXX pattern
  const badOrders = await db.execute(sql`
    SELECT id, order_number, created_at
    FROM orders
    WHERE order_number IS NULL
       OR order_number NOT LIKE 'FH-%'
    ORDER BY created_at ASC
  `);

  if (badOrders.rows.length === 0) {
    console.log('✅ All order numbers are correctly formatted!');
    return;
  }

  console.log(`Found ${badOrders.rows.length} orders with bad order numbers:\n`);
  for (const row of badOrders.rows) {
    console.log(`  - ID: ${row.id} | Current: ${row.order_number} | Date: ${row.created_at}`);
  }

  console.log('\n🔧 Fixing order numbers...\n');

  for (const row of badOrders.rows) {
    const createdAt = new Date(row.created_at as string);
    const year  = createdAt.getFullYear().toString().slice(-2);
    const month = (createdAt.getMonth() + 1).toString().padStart(2, '0');
    const day   = createdAt.getDate().toString().padStart(2, '0');
    const datePrefix = `FH-${year}${month}${day}`;

    // Count how many orders exist for that day (to assign sequence)
    const dayStart = new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate());
    const dayEnd   = new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate() + 1);

    const countResult = await db.execute(sql`
      SELECT COUNT(*)::int AS count
      FROM orders
      WHERE created_at >= ${dayStart.toISOString()}
        AND created_at < ${dayEnd.toISOString()}
        AND (order_number LIKE ${datePrefix + '%'} OR order_number IS NULL OR order_number NOT LIKE 'FH-%')
        AND id <= ${row.id as string}
    `);

    const sequence = ((countResult.rows[0]?.count as number) || 1).toString().padStart(4, '0');
    const newOrderNumber = `${datePrefix}-${sequence}`;

    await db.execute(sql`
      UPDATE orders
      SET order_number = ${newOrderNumber}
      WHERE id = ${row.id as string}
    `);

    console.log(`  ✅ ${row.order_number} → ${newOrderNumber}`);
  }

  console.log('\n✅ Done! All order numbers fixed successfully.');
}

fixOrderNumbers().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
