import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL environment variable is required");
const sql = neon(DATABASE_URL);

async function check() {
  console.log('=== BRANDS & CATEGORIES ===\n');

  const brandCategories = await sql`
    SELECT brand, category, COUNT(*) as count 
    FROM products 
    GROUP BY brand, category 
    ORDER BY count DESC 
    LIMIT 20
  `;

  brandCategories.forEach((p: any) =>
    console.log(`${p.brand} | ${p.category} | ${p.count} products`)
  );

  console.log('\n=== TOTAL PRODUCTS ===');
  const total = await sql`SELECT COUNT(*) as total FROM products`;
  console.log(`Total: ${total[0].total} products`);

  console.log('\n=== UNIQUE CATEGORIES ===');
  const cats = await sql`SELECT DISTINCT category FROM products ORDER BY category`;
  cats.forEach((c: any) => console.log(`- ${c.category}`));

  console.log('\n=== UNIQUE BRANDS ===');
  const brands = await sql`SELECT DISTINCT brand FROM products ORDER BY brand LIMIT 15`;
  brands.forEach((b: any) => console.log(`- ${b.brand}`));
}

check().then(() => process.exit(0)).catch(console.error);
