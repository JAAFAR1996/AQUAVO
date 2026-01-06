/**
 * اتصال مباشر بقاعدة البيانات لإضافة خيارات اللصق
 */

import { neon } from "@neondatabase/serverless";

// اتصال مباشر بقاعدة البيانات
const DATABASE_URL = "postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";

const sql = neon(DATABASE_URL);

async function addGlueVariants() {
    console.log("═══════════════════════════════════════════════════");
    console.log("🔗 الاتصال بقاعدة بيانات Neon...");
    console.log("═══════════════════════════════════════════════════\n");

    // اختبار الاتصال
    const test = await sql`SELECT COUNT(*) as total FROM products`;
    console.log(`✅ متصل! عدد المنتجات: ${test[0].total}\n`);

    // البحث عن منتج اللصق
    console.log("🔍 البحث عن منتجات اللصق...\n");
    const glueProducts = await sql`
        SELECT id, name, slug, has_variants 
        FROM products 
        WHERE slug LIKE '%instant%' 
           OR slug LIKE '%glue%'
           OR name LIKE '%لصق%'
           OR name LIKE '%Glue%'
    `;

    console.log(`📦 تم العثور على ${glueProducts.length} منتج:\n`);
    glueProducts.forEach(p => {
        console.log(`   - ${p.name} (${p.id})`);
    });

    if (glueProducts.length === 0) {
        console.log("\n❌ لم يتم العثور على منتجات لصق!");

        // عرض بعض المنتجات للتأكد
        const sample = await sql`SELECT id, name FROM products LIMIT 10`;
        console.log("\n📋 عينة من المنتجات:");
        sample.forEach(p => console.log(`   - ${p.name}`));

        process.exit(1);
    }

    // الخيارات
    const variants = [
        { id: "5g-green", label: "5 جرام - أخضر", price: 0, stock: 50, isDefault: false, specifications: { "الوزن": "5 جرام", "اللون": "أخضر" } },
        { id: "5g-white", label: "5 جرام - أبيض", price: 0, stock: 50, isDefault: false, specifications: { "الوزن": "5 جرام", "اللون": "أبيض" } },
        { id: "20g-white", label: "20 جرام - أبيض", price: 0, stock: 50, isDefault: false, specifications: { "الوزن": "20 جرام", "اللون": "أبيض" } },
        { id: "50g-clear", label: "50 جرام - شفاف (CA)", price: 0, stock: 50, isDefault: true, specifications: { "الوزن": "50 جرام", "اللون": "شفاف" } }
    ];

    // تحديث كل منتج
    console.log("\n🔄 إضافة الخيارات...\n");

    for (const product of glueProducts) {
        console.log(`📦 تحديث: ${product.name}`);

        await sql`
            UPDATE products 
            SET 
                has_variants = true,
                variants = ${JSON.stringify(variants)}::jsonb
            WHERE id = ${product.id}
        `;

        console.log(`   ✅ تم إضافة ${variants.length} خيارات!\n`);
    }

    // التحقق
    console.log("═══════════════════════════════════════════════════");
    console.log("✅ التحقق من النتيجة:");
    console.log("═══════════════════════════════════════════════════\n");

    const verify = await sql`
        SELECT id, name, has_variants 
        FROM products 
        WHERE slug LIKE '%instant%' 
           OR slug LIKE '%glue%'
           OR name LIKE '%لصق%'
    `;

    verify.forEach(p => {
        console.log(`📦 ${p.name}: has_variants = ${p.has_variants ? '✅ نعم' : '❌ لا'}`);
    });

    console.log("\n✅ تم بنجاح! أعد تحميل صفحة الأدمن لترى التغييرات.");
    process.exit(0);
}

addGlueVariants().catch(e => {
    console.error("\n❌ خطأ:", e.message);
    process.exit(1);
});
