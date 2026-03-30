import { neon } from '@neondatabase/serverless';
const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

// Check existing product structure to follow same pattern
const sample = await sql`SELECT id, slug, name, brand, category, subcategory, price, currency, stock, images, thumbnail, specifications FROM products WHERE deleted_at IS NULL LIMIT 2`;
console.log(JSON.stringify(sample, null, 2));

// Check categories
const cats = await sql`SELECT DISTINCT category FROM products WHERE deleted_at IS NULL ORDER BY category`;
console.log('\nCategories:', cats.map(c => c.category).join(', '));

// Check if these already exist
const existing = await sql`SELECT slug, name FROM products WHERE slug IN ('sunsun-air-pump', 'general-air-stone', 'general-sponge-filter-xy180') AND deleted_at IS NULL`;
console.log('\nAlready exist:', existing.length > 0 ? existing : 'NONE');
