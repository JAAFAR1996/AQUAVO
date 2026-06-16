import { neon } from '@neondatabase/serverless';

const DB = 'postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = neon(DB);

// 1. Check the oxygenation tube product in DB
const tube = await sql`SELECT id, name, price, slug, variants FROM products WHERE slug = 'houyi-oxygenation-tube'`;
console.log('=== houyi-oxygenation-tube ===');
console.log(JSON.stringify(tube[0], null, 2));

// 2. Check the product in price_history
const history = await sql`SELECT * FROM price_history WHERE product_id = 'houyi-oxygenation-tube' ORDER BY changed_at DESC LIMIT 5`;
console.log('\n=== price_history ===');
console.log(JSON.stringify(history, null, 2));

// 3. Check inventory for this product
const inv = await sql`SELECT * FROM inventory WHERE product_id = 'houyi-oxygenation-tube' LIMIT 5`;
console.log('\n=== inventory ===');
console.log(JSON.stringify(inv, null, 2));
