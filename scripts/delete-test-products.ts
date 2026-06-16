import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

async function main() {
    console.log('='.repeat(60));
    console.log('حذف المنتجات التجريبية (JAAFAR1996\'s Org)');
    console.log('='.repeat(60));

    // Test/dummy products to delete
    const testProductSlugs = [
        '6b9774c5-9925-4381-8aef-e25031e82747',
        'eb17d059-d8cb-466b-9bdd-e6ea37f0bcec',
        '42029ce9-9c24-4b64-8978-9239cebf95ce',
        'b321f782-901f-40c9-b4d6-b323b91e2bec',
        '0ada541f-2f60-4c02-932a-1cece04a04bf',
        'f99e989b-fbe5-46a0-9f2f-443356a0690e',
    ];

    console.log('\nالمنتجات المُستهدفة للحذف:');
    for (const slug of testProductSlugs) {
        console.log(`  - ${slug}`);
    }

    // First, check these products exist
    const existing = await sql`
    SELECT slug, name FROM products 
    WHERE slug = ANY(${testProductSlugs})
  `;

    console.log(`\nوُجد ${existing.length} منتجات من أصل ${testProductSlugs.length}`);

    if (existing.length === 0) {
        console.log('لا توجد منتجات تجريبية للحذف.');
        return;
    }

    // Delete product images first (foreign key)
    const deletedImages = await sql`
    DELETE FROM product_images 
    WHERE product_id IN (
      SELECT id FROM products WHERE slug = ANY(${testProductSlugs})
    )
    RETURNING id
  `;
    console.log(`\nتم حذف ${deletedImages.length} صورة مرتبطة`);

    // Delete the products
    const deleted = await sql`
    DELETE FROM products 
    WHERE slug = ANY(${testProductSlugs})
    RETURNING slug, name
  `;

    console.log(`\n✅ تم حذف ${deleted.length} منتج تجريبي:`);
    for (const p of deleted) {
        console.log(`  - ${p.slug}: ${p.name}`);
    }

    // Verify
    const remaining = await sql`SELECT COUNT(*) as count FROM products`;
    console.log(`\n📊 المنتجات المتبقية: ${remaining[0].count}`);
}

main().catch(console.error);
