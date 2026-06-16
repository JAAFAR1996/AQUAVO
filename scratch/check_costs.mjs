import { neon } from '@neondatabase/serverless';
const DB = "postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const sql = neon(DB);

const rows = await sql`
  SELECT id, name FROM products
  WHERE deleted_at IS NULL
  ORDER BY name
`;
console.log(JSON.stringify(rows.map(r => ({ id: r.id, name: r.name })), null, 2));
