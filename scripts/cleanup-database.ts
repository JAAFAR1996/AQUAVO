import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

async function main() {
    console.log('='.repeat(70));
    console.log('تنظيف قاعدة البيانات - حذف المنتجات التجريبية والمُكررة');
    console.log('='.repeat(70));

    // ============================================
    // 1. Delete JAAFAR1996's Org test products
    // ============================================
    console.log('\n📌 الخطوة 1: حذف المنتجات التجريبية (JAAFAR1996\'s Org)');

    const testSlugs = [
        'jaafar1996s-org',
        'jaafar1996s-org-1',
        'jaafar1996s-org-2',
        'jaafar1996s-org-3',
        'jaafar1996s-org-4',
        'jaafar1996s-org-5',
    ];

    const testDeleted = await sql`
    DELETE FROM products WHERE slug = ANY(${testSlugs})
    RETURNING slug, name
  `;

    console.log(`   ✅ تم حذف ${testDeleted.length} منتج تجريبي`);
    for (const p of testDeleted) {
        console.log(`      - ${p.slug}`);
    }

    // ============================================
    // 2. Delete HYGGER duplicate products
    // ============================================
    console.log('\n📌 الخطوة 2: حذف منتجات HYGGER المُكررة');

    const hyggerDuplicates = [
        // HG-978 duplicates (hg-978-22w has 3 variants: 22W, 26W, 36W)
        'hg-978-18w',   // Will add as variant
        'hg-978-26w',   // Duplicate
        'hg-978-36w',   // Duplicate

        // HG957 duplicate (hg-957-36w has 2 variants)
        'hg957-48w',    // Duplicate

        // HC004 duplicates (hc004-s has 4 variants)
        'hc004-m',      // Duplicate
        'hc004-l',      // Duplicate
        'hc004-xl',     // Duplicate

        // HG124 duplicates (hg124-s has 3 variants)
        'hg124-m',      // Duplicate
        'hg124-l',      // Duplicate

        // HG153 duplicate (hg153-10w has 2 variants)
        'hg153-18w',    // Duplicate

        // HG101 duplicate (hg101-1200l-uv has 2 variants)
        'hg101-1800l-uv', // Duplicate
    ];

    const hyggerDeleted = await sql`
    DELETE FROM products WHERE slug = ANY(${hyggerDuplicates})
    RETURNING slug, name, price
  `;

    console.log(`   ✅ تم حذف ${hyggerDeleted.length} منتج HYGGER مُكرر`);
    for (const p of hyggerDeleted) {
        console.log(`      - ${p.slug}: ${p.name}`);
    }

    // ============================================
    // 3. Add 18W variant to hg-978-22w if missing
    // ============================================
    console.log('\n📌 الخطوة 3: إضافة متغير 18W للإضاءة HG-978');

    const mainLight = await sql`SELECT id, variants FROM products WHERE slug = 'hg-978-22w'`;

    if (mainLight.length > 0) {
        let variants = mainLight[0].variants || [];
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
                    "الموديل": "HG-978-18W",
                    "حجم الحوض": "18-24 بوصة"
                }
            };

            variants = [newVariant, ...variants];

            await sql`
        UPDATE products 
        SET variants = ${JSON.stringify(variants)}::jsonb
        WHERE slug = 'hg-978-22w'
      `;
            console.log('   ✅ تمت إضافة متغير 18 واط');
        } else {
            console.log('   ℹ️ متغير 18 واط موجود بالفعل');
        }
    }

    // ============================================
    // 4. Verify final count
    // ============================================
    console.log('\n' + '='.repeat(70));
    console.log('📊 النتيجة النهائية:');
    console.log('='.repeat(70));

    const remaining = await sql`SELECT COUNT(*) as count FROM products`;
    const byBrand = await sql`
    SELECT brand, COUNT(*) as count 
    FROM products 
    GROUP BY brand 
    ORDER BY count DESC
  `;

    console.log(`\nإجمالي المنتجات: ${remaining[0].count}`);
    console.log('\nحسب الماركة:');
    for (const b of byBrand) {
        console.log(`   ${b.brand}: ${b.count}`);
    }

    console.log('\n✅ تم تنظيف قاعدة البيانات بنجاح!');
}

main().catch(console.error);
