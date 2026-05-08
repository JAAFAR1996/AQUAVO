/**
 * حذف طلبات محددة من قاعدة البيانات بشكل آمن
 * الطلبات المراد حذفها:
 *  - 92030499
 *  - d88b17bd
 *  - FW-260428-0001
 * 
 * تشغيل: node scripts/delete-orders.mjs
 * تشغيل مع التأكيد: node scripts/delete-orders.mjs --confirm
 */

import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load env vars - try env.prod first (correct credentials), then fallback
config({ path: resolve(__dirname, '../env.prod') });
if (!process.env.DATABASE_URL) {
  config({ path: resolve(__dirname, '../.env') });
}

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) {
  console.error('❌ DATABASE_URL غير موجود في ملفات البيئة');
  process.exit(1);
}

// Strip channel_binding=require (causes auth issues with @neondatabase/serverless)
const DATABASE_URL = rawUrl.replace(/[&?]channel_binding=require/g, '');


const sql = neon(DATABASE_URL);

// الطلبات المراد حذفها - نبحث بالـ order_number أو بجزء من الـ id
const TARGET_IDENTIFIERS = [
  '92030499',
  'd88b17bd',
  'FW-260428-0001',
];

const DRY_RUN = !process.argv.includes('--confirm');

async function main() {
  console.log('');
  console.log('════════════════════════════════════════');
  console.log('  🗑️  سكريبت حذف الطلبات - AQUAVO');
  console.log('════════════════════════════════════════');
  
  if (DRY_RUN) {
    console.log('\n⚠️  وضع المعاينة (Dry Run) - لن يُحذف شيء');
    console.log('   لتنفيذ الحذف الفعلي: node scripts/delete-orders.mjs --confirm\n');
  } else {
    console.log('\n🔴 وضع الحذف الفعلي - سيتم الحذف نهائياً!\n');
  }

  // البحث عن الطلبات باستخدام order_number أو id (جزئي أو كامل)
  console.log('🔍 البحث عن الطلبات...\n');

  const foundOrders = [];

  for (const identifier of TARGET_IDENTIFIERS) {
    const rows = await sql`
      SELECT 
        id,
        order_number,
        customer_name,
        total,
        status,
        created_at
      FROM orders
      WHERE 
        order_number = ${identifier}
        OR order_number LIKE ${'%' + identifier + '%'}
        OR id = ${identifier}
        OR id LIKE ${identifier + '%'}
      LIMIT 5
    `;

    if (rows.length === 0) {
      console.log(`  ⚠️  لم يُعثر على طلب: "${identifier}"`);
    } else {
      for (const row of rows) {
        console.log(`  ✅ وُجد: ID=${row.id}`);
        console.log(`         Order#=${row.order_number}`);
        console.log(`         العميل=${row.customer_name}`);
        console.log(`         المبلغ=${Number(row.total).toLocaleString('ar-IQ')} د.ع`);
        console.log(`         الحالة=${row.status}`);
        console.log(`         التاريخ=${new Date(row.created_at).toLocaleDateString('ar-IQ')}`);
        console.log('');
        foundOrders.push(row);
      }
    }
  }

  if (foundOrders.length === 0) {
    console.log('❌ لم يُعثر على أي طلب. تأكد من الـ IDs.');
    process.exit(0);
  }

  console.log(`\n📋 إجمالي الطلبات المراد حذفها: ${foundOrders.length}`);

  if (DRY_RUN) {
    console.log('\n✋ المعاينة انتهت. لتنفيذ الحذف:');
    console.log('   node scripts/delete-orders.mjs --confirm\n');
    return;
  }

  // تنفيذ الحذف
  console.log('\n🔥 جاري الحذف...\n');

  for (const order of foundOrders) {
    const orderId = order.id;

    try {
      // 1. حذف order_items_relational
      const deletedItems = await sql`
        DELETE FROM order_items_relational
        WHERE order_id = ${orderId}
        RETURNING id
      `;
      console.log(`  🧹 [${order.order_number || orderId}] حُذف ${deletedItems.length} عنصر من order_items`);

      // 2. حذف payments
      const deletedPayments = await sql`
        DELETE FROM payments
        WHERE order_id = ${orderId}
        RETURNING id
      `;
      console.log(`  💳 [${order.order_number || orderId}] حُذف ${deletedPayments.length} سجل دفع`);

      // 3. تحديث referrals (إزالة ربط first_order_id)
      await sql`
        UPDATE referrals
        SET first_order_id = NULL
        WHERE first_order_id = ${orderId}
      `;

      // 4. حذف الطلب نفسه
      const deletedOrder = await sql`
        DELETE FROM orders
        WHERE id = ${orderId}
        RETURNING id, order_number
      `;

      if (deletedOrder.length > 0) {
        console.log(`  ✅ [${order.order_number || orderId}] حُذف الطلب بنجاح!\n`);
      } else {
        console.log(`  ⚠️  [${orderId}] الطلب لم يُحذف (ربما محذوف مسبقاً)\n`);
      }

    } catch (err) {
      console.error(`  ❌ خطأ في حذف الطلب ${orderId}:`, err.message);
    }
  }

  console.log('════════════════════════════════════════');
  console.log('  ✅ اكتملت عملية الحذف');
  console.log('════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('❌ خطأ غير متوقع:', err);
  process.exit(1);
});
