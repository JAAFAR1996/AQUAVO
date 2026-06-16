import { neon } from '@neondatabase/serverless';

const DATABASE_URL = "postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const sql = neon(DATABASE_URL);

// First check columns
const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'products' ORDER BY ordinal_position`;
console.log("COLUMNS:", cols.map(c => c.column_name).join(', '));

// Then get first 10 houyi products
const products = await sql`SELECT id, name, slug FROM products WHERE brand = 'houyi' ORDER BY id ASC LIMIT 10`;
console.log(JSON.stringify(products, null, 2));
