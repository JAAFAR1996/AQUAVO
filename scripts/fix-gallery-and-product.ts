import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function main() {
    // 1. Find the broken product (houyi instant glue)
    console.log('=== FINDING GLUE PRODUCT ===');
    const products = await sql`SELECT id, name, slug FROM products WHERE slug LIKE '%houyi-instant-glue%'`;
    products.forEach((r) => console.log(`ID: ${r.id} | Name: ${r.name} | Slug: ${r.slug}`));

    // 2. Fix the product name
    if (products.length > 0) {
        const correctName = 'HOUYI صمغ سيانو أكريليت فوري - لصق النباتات والأخشاب | 5g / 20g / 50g';
        console.log('\n=== FIXING PRODUCT NAME ===');
        await sql`UPDATE products SET name = ${correctName} WHERE slug LIKE '%houyi-instant-glue%'`;
        console.log(`Updated to: ${correctName}`);
    }

    // 3. Delete gallery submissions
    console.log('\n=== GALLERY ===');
    const before = await sql`SELECT count(*) as cnt FROM gallery_submissions`;
    console.log(`Gallery entries before: ${before[0].cnt}`);

    // Delete votes first (foreign key)
    await sql`DELETE FROM gallery_votes`;
    console.log('Deleted gallery votes');

    // Delete submissions
    await sql`DELETE FROM gallery_submissions`;
    console.log('Deleted all gallery submissions');

    const after = await sql`SELECT count(*) as cnt FROM gallery_submissions`;
    console.log(`Gallery entries after: ${after[0].cnt}`);

    console.log('\n✅ Done!');
}

main().catch(console.error);
