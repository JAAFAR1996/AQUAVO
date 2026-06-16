import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

async function main() {
    console.log('='.repeat(70));
    console.log('فحص المنتجات ذات السعر الصفري');
    console.log('='.repeat(70));

    // Find products with price = 0
    const zeroPrice = await sql`
    SELECT slug, name, brand, category, price, stock 
    FROM products 
    WHERE price = 0 OR price IS NULL
    ORDER BY brand, name
  `;

    console.log(`\nوُجد ${zeroPrice.length} منتج بسعر صفري:`);
    for (const p of zeroPrice) {
        console.log(`\n  📦 ${p.slug}`);
        console.log(`     الاسم: ${p.name}`);
        console.log(`     الماركة: ${p.brand} | الفئة: ${p.category}`);
        console.log(`     المخزون: ${p.stock}`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('💡 توصية: يجب تحديد أسعار لهذه المنتجات أو حذفها');
    console.log('='.repeat(70));
}

main().catch(console.error);
