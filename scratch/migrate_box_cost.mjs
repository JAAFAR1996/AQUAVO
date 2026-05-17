import { neon } from '@neondatabase/serverless';
const DB = "postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const sql = neon(DB);

await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS box_cost numeric DEFAULT '0'`;
console.log("✅ تم إضافة عمود box_cost للطلبيات");
