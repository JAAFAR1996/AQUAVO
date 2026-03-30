import { neon } from '@neondatabase/serverless';
const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

const r = await sql`SELECT slug, name, thumbnail, images FROM products WHERE slug = 'houyi-koi-fish-net'`;
console.log('slug:', r[0].slug);
console.log('name:', r[0].name);
console.log('thumbnail:', r[0].thumbnail);
console.log('images:', JSON.stringify(r[0].images, null, 2));
