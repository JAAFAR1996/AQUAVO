import { neon } from '@neondatabase/serverless';
const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');
await sql`UPDATE products SET name = 'رمل الجداول الطبيعي — 2-6 مم، لا يحتاج غسيلاً', updated_at = NOW() WHERE slug = 'houyi-stream-sand'`;
const r = await sql`SELECT name FROM products WHERE slug = 'houyi-stream-sand'`;
console.log('✅', r[0].name);
