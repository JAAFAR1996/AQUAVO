import { getDb } from '../server/db.js';
import { products } from '../shared/schema.js';
import { like } from 'drizzle-orm';

async function listYeeProducts() {
    const db = getDb();
    const results = await db
        .select({ slug: products.slug, name: products.name, brand: products.brand })
        .from(products)
        .where(like(products.slug, '%yee%'));

    console.log(`Found ${results.length} YEE products:\n`);
    results.forEach((p, i) => {
        console.log(`${i + 1}. ${p.slug}`);
        console.log(`   → ${p.name}`);
        console.log(`   → Brand: ${p.brand}\n`);
    });
    process.exit(0);
}

listYeeProducts();
