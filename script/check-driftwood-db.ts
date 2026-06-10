import { neon } from "@neondatabase/serverless";

const DB_URL = process.env.DATABASE_URL!;
const sql = neon(DB_URL);

async function verify() {
  const rows = await sql`
    SELECT slug, name, price, thumbnail
    FROM products 
    WHERE slug LIKE 'aquavo-driftwood-%'
    ORDER BY slug
  `;
  console.log(`\n✅ Total driftwood products in DB: ${rows.length}\n`);
  rows.forEach((r) =>
    console.log(`  ${r.slug} | ${r.price} IQD | img: ${r.thumbnail}`)
  );
  process.exit(0);
}

verify().catch((e) => { console.error(e); process.exit(1); });
