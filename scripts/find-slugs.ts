import { getDb } from '../server/db.js';
import { products } from '../shared/schema.js';
import { like, or } from 'drizzle-orm';

async function findSlugs() {
    const db = getDb();
    const results = await db
        .select({ slug: products.slug, name: products.name })
        .from(products)
        .where(or(
            like(products.slug, '%koi%'),
            like(products.slug, '%ranchu%'),
            like(products.slug, '%hanger%'),
            like(products.slug, '%coated%'),
            like(products.slug, '%color%'),
            like(products.slug, '%formulated%'),
            like(products.slug, '%sinks%'),
            like(products.name, '%كوي%'),
            like(products.name, '%رانشو%'),
            like(products.name, '%معلق%')
        ));

    console.log('Found products:');
    if (results.length === 0) {
        console.log('  (none found)');
    } else {
        results.forEach(p => console.log(`  ${p.slug}\n    → ${p.name}`));
    }
    process.exit(0);
}

findSlugs();
