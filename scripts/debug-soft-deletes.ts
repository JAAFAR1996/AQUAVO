import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
  // Check if there are soft-deleted products
  const deleted = await sql`SELECT count(*) as cnt FROM products WHERE deleted_at IS NOT NULL`;
  console.log(`Soft-deleted products count: ${deleted[0].cnt}`);

  // Check how many products have UUID-like slugs
  const uuidSlugs = await sql`SELECT count(*) as cnt FROM products WHERE slug LIKE '%-%-%-%-%' AND length(slug) = 36`;
  console.log(`Products with UUID slugs: ${uuidSlugs[0].cnt}`);

  // Show a few soft deleted ones
  if (deleted[0].cnt > 0) {
    const samples = await sql`SELECT id, slug, name, brand FROM products WHERE deleted_at IS NOT NULL LIMIT 3`;
    console.log("Deleted samples:", samples);
  } else {
    // If no soft deletes, maybe they are in another table?
    const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    console.log("Tables in DB:", tables.map((t: any) => t.table_name).join(", "));
  }
}

main().catch(console.error);
