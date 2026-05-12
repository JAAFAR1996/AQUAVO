import { neon } from "@neondatabase/serverless";
const sql = neon("postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require");

const rows = await sql`SELECT id, type, title, url, metadata, channel, clicked_at FROM notification_log ORDER BY sent_at DESC LIMIT 10`;
rows.forEach(n => console.log(JSON.stringify(n, null, 2)));
console.log("\nTotal:", rows.length);
