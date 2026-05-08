import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../env.prod') });
const sql = neon(process.env.DATABASE_URL.replace(/[&?]channel_binding=require/g, ''));

const [total] = await sql`SELECT COUNT(*)::int as c FROM reviews`;
console.log('\n📊 إجمالي المراجعات:', total.c);

if (total.c === 0) {
  console.log('⚠️  لا توجد مراجعات في قاعدة البيانات.\n');
  process.exit(0);
}

const reviews = await sql`
  SELECT 
    r.id,
    r.rating,
    r.title,
    r.comment,
    r.status,
    r.verified_purchase,
    r.created_at,
    p.name as product_name,
    u.full_name as user_name,
    u.email as user_email
  FROM reviews r
  LEFT JOIN products p ON r.product_id = p.id
  LEFT JOIN users u ON r.user_id = u.id
  ORDER BY r.created_at DESC
  LIMIT 20
`;

console.log(`\nآخر ${reviews.length} مراجعة:\n`);
for (const r of reviews) {
  console.log(`  ⭐ ${r.rating}/5 | ${r.product_name}`);
  console.log(`     المستخدم: ${r.user_name || 'ضيف'} (${r.user_email || 'لا يوجد'})`);
  console.log(`     العنوان: ${r.title || '(بدون عنوان)'}`);
  console.log(`     الحالة: ${r.status} | شراء موثق: ${r.verified_purchase ? 'نعم' : 'لا'}`);
  console.log(`     التاريخ: ${new Date(r.created_at).toLocaleDateString('ar-IQ')}`);
  console.log('');
}

// إحصائيات
const stats = await sql`
  SELECT 
    status,
    COUNT(*)::int as count,
    AVG(rating)::numeric(3,1) as avg_rating
  FROM reviews
  GROUP BY status
`;
console.log('📈 إحصائيات:\n');
for (const s of stats) {
  console.log(`  ${s.status}: ${s.count} مراجعة | متوسط التقييم: ${s.avg_rating}`);
}
console.log('');
