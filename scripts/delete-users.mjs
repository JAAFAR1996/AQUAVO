/**
 * حذف حسابات مستخدمين محددة مع كل بياناتهم
 * تشغيل معاينة: node scripts/delete-users.mjs
 * تشغيل فعلي:   node scripts/delete-users.mjs --confirm
 */

import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../env.prod') });

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) { console.error('❌ DATABASE_URL غير موجود'); process.exit(1); }
const DATABASE_URL = rawUrl.replace(/[&?]channel_binding=require/g, '');
const sql = neon(DATABASE_URL);

const DRY_RUN = !process.argv.includes('--confirm');

// الحسابات المراد حذفها
const TARGET_EMAILS = [
  'admin@fishstore.com',
  'testbuyer@aquavo.iq',
  'jaafarhabash@yahoo.com',
  'testuser2026@test.com',
  'jaafarhabas22h@outlook.com',
  'jaafarhabash@gmail.com',
  'jaafarhabash96@yahoo.com',
  'jaafarhabash@YAHOO.com',
];

// حذف آمن - لا يرمي خطأ إذا الجدول غير موجود
async function safeDelete(table, condition, params) {
  try {
    await sql(`DELETE FROM ${table} WHERE ${condition}`, params);
  } catch (e) {
    if (!e.message?.includes('does not exist')) throw e;
  }
}

async function deleteUser(u) {
  const id = u.id;

  // ① طلبات + عناصرها + مدفوعاتها
  const userOrders = await sql`SELECT id FROM orders WHERE user_id = ${id}`;
  for (const order of userOrders) {
    await sql`DELETE FROM order_items_relational WHERE order_id = ${order.id}`;
    await sql`DELETE FROM payments WHERE order_id = ${order.id}`;
    try { await sql`DELETE FROM return_requests WHERE order_id = ${order.id}`; } catch {}
  }
  const delOrders = await sql`DELETE FROM orders WHERE user_id = ${id} RETURNING id`;

  // ② كل الجداول المرتبطة بـ user_id (بالترتيب الصحيح)
  const dels = [
    `DELETE FROM ai_agent_settings WHERE updated_by = '${id}'`,
    `DELETE FROM ai_email_metrics WHERE user_id = '${id}'`,
    `DELETE FROM aquarium_designs WHERE user_id = '${id}'`,
    `DELETE FROM audit_logs WHERE user_id = '${id}'`,
    `DELETE FROM auto_orders WHERE user_id = '${id}'`,
    `DELETE FROM cart_items WHERE user_id = '${id}'`,
    `DELETE FROM cart_sessions WHERE user_id = '${id}'`,
    `DELETE FROM chat_messages WHERE user_id = '${id}'`,
    `DELETE FROM churn_predictions WHERE user_id = '${id}'`,
    `DELETE FROM coupons WHERE user_id = '${id}'`,
    `DELETE FROM customer_profiles WHERE user_id = '${id}'`,
    `DELETE FROM email_campaigns WHERE user_id = '${id}'`,
    `DELETE FROM favorites WHERE user_id = '${id}'`,
    `DELETE FROM gallery_submissions WHERE user_id = '${id}'`,
    `DELETE FROM image_analyses WHERE user_id = '${id}'`,
    `DELETE FROM journey_plans WHERE user_id = '${id}'`,
    `DELETE FROM login_attempts WHERE user_id = '${id}'`,
    `DELETE FROM loyalty_transactions WHERE user_id = '${id}'`,
    `DELETE FROM notification_log WHERE user_id = '${id}'`,
    `DELETE FROM page_views WHERE user_id = '${id}'`,
    `DELETE FROM password_reset_tokens WHERE user_id = '${id}'`,
    `DELETE FROM predicted_needs WHERE user_id = '${id}'`,
    `DELETE FROM product_interactions WHERE user_id = '${id}'`,
    `DELETE FROM product_views WHERE user_id = '${id}'`,
    `DELETE FROM push_subscriptions WHERE user_id = '${id}'`,
    `DELETE FROM referrals WHERE referrer_user_id = '${id}' OR referred_user_id = '${id}'`,
    `DELETE FROM referral_codes WHERE user_id = '${id}'`,
    `DELETE FROM return_requests WHERE user_id = '${id}' OR processed_by = '${id}'`,
    `DELETE FROM review_ratings WHERE user_id = '${id}'`,
    `DELETE FROM reviews WHERE user_id = '${id}'`,
    `DELETE FROM search_queries WHERE user_id = '${id}'`,
    `DELETE FROM sentiment_history WHERE user_id = '${id}'`,
    `DELETE FROM social_connections WHERE user_id = '${id}'`,
    `DELETE FROM support_tickets WHERE user_id = '${id}' OR assigned_to_user_id = '${id}'`,
    `DELETE FROM user_addresses WHERE user_id = '${id}'`,
  ];

  for (const stmt of dels) {
    try { await sql(stmt); } catch (e) {
      if (!e.message?.includes('does not exist')) throw e;
    }
  }

  // ③ حذف المستخدم نفسه
  await sql`DELETE FROM users WHERE id = ${id}`;

  return delOrders.length;
}

async function main() {
  console.log('\n════════════════════════════════════════');
  console.log('  👤  سكريبت حذف المستخدمين - AQUAVO');
  console.log('════════════════════════════════════════');

  if (DRY_RUN) {
    console.log('\n⚠️  وضع المعاينة - لن يُحذف شيء');
    console.log('   للحذف الفعلي: node scripts/delete-users.mjs --confirm\n');
  } else {
    console.log('\n🔴 وضع الحذف الفعلي!\n');
  }

  const emailList = TARGET_EMAILS.map(e => `'${e.toLowerCase()}'`).join(',');
  const users = await sql(`
    SELECT id, full_name, email, role, created_at 
    FROM users 
    WHERE LOWER(email) = ANY(ARRAY[${emailList}])
  `);

  if (users.length === 0) {
    console.log('⚠️  لم يُعثر على أي مستخدم.');
    return;
  }

  console.log(`🔍 وُجد ${users.length} مستخدم:\n`);
  for (const u of users) {
    console.log(`  • ${u.full_name || '(بدون اسم)'} — ${u.email} — ${u.role} — ${new Date(u.created_at).toLocaleDateString('ar-IQ')}`);
  }

  if (DRY_RUN) {
    console.log('\n✋ المعاينة انتهت. لتنفيذ الحذف:');
    console.log('   node scripts/delete-users.mjs --confirm\n');
    return;
  }

  console.log('\n🔥 جاري الحذف...\n');

  for (const u of users) {
    try {
      const ordersDeleted = await deleteUser(u);
      console.log(`  ✅ ${u.email} — حُذف (${ordersDeleted} طلب)`);
    } catch (err) {
      console.error(`  ❌ خطأ في حذف ${u.email}:`, err.message);
    }
  }

  console.log('\n════════════════════════════════════════');
  console.log('  ✅ اكتملت عملية الحذف');
  console.log('════════════════════════════════════════\n');
}

main().catch(err => { console.error('❌', err); process.exit(1); });
