import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

async function main() {
    console.log('='.repeat(60));
    console.log('حذف منتجات HYGGER المُكررة');
    console.log('='.repeat(60));

    // These products already exist as variants in other products
    const duplicateSlugs = [
        // HG-978 duplicates (22W has variants for 22W, 26W, 36W)
        'hygger-hg-978-18w',   // Will add as variant to main product
        'hygger-hg-978-26w',   // Duplicate - exists in hygger-hg978-22w variants
        'hygger-hg-978-36w',   // Duplicate - exists in hygger-hg978-22w variants

        // HG957 duplicate (36W has 48W as variant)
        'hygger-hg957-48w',    // Duplicate - exists in hygger-hg957-36w variants

        // HC004 duplicates (S has all sizes as variants)
        'hygger-hc004-m',      // Duplicate
        'hygger-hc004-l',      // Duplicate  
        'hygger-hc004-xl',     // Duplicate

        // HG124 duplicates (S has M, L as variants)
        'hygger-hg124-m',      // Duplicate
        'hygger-hg124-l',      // Duplicate

        // HG153 duplicate (10W has 18W as variant)
        'hygger-hg153-18w',    // Duplicate

        // HG101 duplicate (1200L has 1800L as variant)
        'hygger-hg101-1800l-uv', // Duplicate
    ];

    console.log('\nفحص المنتجات المُكررة...');

    // Check which products exist
    const existing = await sql`
    SELECT slug, name, price FROM products 
    WHERE slug = ANY(${duplicateSlugs})
    ORDER BY slug
  `;

    console.log(`\nوُجد ${existing.length} منتج مُكرر من أصل ${duplicateSlugs.length}:`);
    for (const p of existing) {
        console.log(`  - ${p.slug}: ${p.name} (${p.price} IQD)`);
    }

    if (existing.length === 0) {
        console.log('\n✅ لا توجد منتجات مُكررة للحذف.');
        return;
    }

    // Get the slugs that actually exist
    const existingSlugs = existing.map((p: any) => p.slug);

    // Delete product images first
    const deletedImages = await sql`
    DELETE FROM product_images 
    WHERE product_id IN (
      SELECT id FROM products WHERE slug = ANY(${existingSlugs})
    )
    RETURNING id
  `;
    console.log(`\nتم حذف ${deletedImages.length} صورة مرتبطة`);

    // Delete the duplicate products
    const deleted = await sql`
    DELETE FROM products 
    WHERE slug = ANY(${existingSlugs})
    RETURNING slug, name
  `;

    console.log(`\n✅ تم حذف ${deleted.length} منتج مُكرر:`);
    for (const p of deleted) {
        console.log(`  - ${p.slug}: ${p.name}`);
    }

    // Now add the 18W variant to hygger-hg978-22w if it doesn't have it
    console.log('\n--- إضافة متغير 18 واط للإضاءة HG-978 ---');

    const mainProduct = await sql`
    SELECT id, variants FROM products WHERE slug = 'hygger-hg978-22w'
  `;

    if (mainProduct.length > 0) {
        const variants = mainProduct[0].variants || [];
        const has18W = variants.some((v: any) => v.id === '18' || v.label?.includes('18'));

        if (!has18W) {
            const newVariant = {
                id: '18',
                label: '18 واط',
                price: 38100,
                stock: 50,
                isDefault: false,
                specifications: {
                    "عدد LEDs": "92",
                    "القدرة": "18 واط",
                    "اللومن": "1260",
                    "الموديل": "HG-978-18W",
                    "حجم الحوض": "18-24 بوصة",
                    "العلامة التجارية": "HYGGER"
                }
            };

            variants.push(newVariant);

            await sql`
        UPDATE products 
        SET variants = ${JSON.stringify(variants)}::jsonb
        WHERE slug = 'hygger-hg978-22w'
      `;
            console.log('✅ تمت إضافة متغير 18 واط بنجاح');
        } else {
            console.log('ℹ️ متغير 18 واط موجود بالفعل');
        }
    }

    // Verify final count
    const remaining = await sql`SELECT COUNT(*) as count FROM products`;
    console.log(`\n📊 المنتجات المتبقية: ${remaining[0].count}`);
}

main().catch(console.error);
