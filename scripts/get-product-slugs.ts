import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function getProductSlugs() {
    console.log('=== ALL PRODUCTS IN DATABASE ===\n');

    const products = await sql`
    SELECT slug, name, brand 
    FROM products 
    ORDER BY brand, name
  `;

    console.log('SLUG | BRAND | NAME');
    console.log('-----|-------|-----');

    products.forEach(p => {
        console.log(`${p.slug} | ${p.brand} | ${p.name}`);
    });

    console.log(`\nTotal: ${products.length} products`);
}

getProductSlugs().catch(console.error);
