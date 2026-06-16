import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  const products = await sql`SELECT id, name, slug, brand, category, subcategory, description, specifications FROM products WHERE deleted_at IS NULL ORDER BY brand, slug`;
  console.log(JSON.stringify(products, null, 2));
}

main().catch(console.error);
