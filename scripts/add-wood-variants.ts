/**
 * إضافة خيارات المقاسات لمنتجات الخشب
 * 
 * المنتجات:
 * 1. Rhododendron Root - 5 مقاسات
 * 2. Polished Driftwood - 4 مقاسات
 * 3. Moss Tree - منتج واحد
 * 4. Mountain Wood - منتج واحد
 * 5. Large Sinking Wood - منتج واحد
 * 6. Thai Branches - منتج واحد
 */

import { neon } from "@neondatabase/serverless";

const DATABASE_URL = "postgresql://neondb_owner:npg_N7dEzt2pWjCi@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(DATABASE_URL);

async function updateWoodProducts() {
    console.log("═══════════════════════════════════════════════════");
    console.log("🌿 إضافة خيارات المقاسات لمنتجات الخشب...");
    console.log("═══════════════════════════════════════════════════\n");

    // 1. Rhododendron Root - 5 مقاسات
    const rhododendronVariants = [
        { id: "30-35cm", label: "30-35 سم", price: 0, stock: 28, isDefault: false },
        { id: "30-45cm", label: "30-45 سم", price: 0, stock: 32, isDefault: false },
        { id: "40-45cm", label: "40-45 سم", price: 0, stock: 32, isDefault: true },
        { id: "50-55cm", label: "50-55 سم", price: 0, stock: 50, isDefault: false },
        { id: "stone-base", label: "30-45 سم (مع قاعدة حجرية)", price: 0, stock: 36, isDefault: false }
    ];

    // 2. Polished Driftwood - 4 مقاسات
    const polishedVariants = [
        { id: "5-8cm", label: "5-8 سم (صغير)", price: 0, stock: 100, isDefault: false },
        { id: "8-10cm", label: "8-10 سم", price: 0, stock: 150, isDefault: false },
        { id: "10-15cm", label: "10-15 سم", price: 0, stock: 100, isDefault: true },
        { id: "15-20cm", label: "15-20 سم (كبير)", price: 0, stock: 65, isDefault: false }
    ];

    // البحث وتحديث المنتجات
    console.log("🔍 البحث عن منتجات الخشب في قاعدة البيانات...\n");

    // تحديث Rhododendron
    const rhodo = await sql`
        SELECT id, name FROM products 
        WHERE LOWER(name) LIKE '%rhododendron%' 
           OR LOWER(name) LIKE '%أغصان%'
           OR LOWER(name) LIKE '%تايلندية%'
        LIMIT 1
    `;

    if (rhodo.length > 0) {
        console.log(`📦 تحديث: ${rhodo[0].name}`);
        await sql`
            UPDATE products 
            SET has_variants = true, variants = ${JSON.stringify(rhododendronVariants)}::jsonb
            WHERE id = ${rhodo[0].id}
        `;
        console.log(`   ✅ أضيف ${rhododendronVariants.length} مقاسات\n`);
    } else {
        console.log("⚠️ لم يتم العثور على Rhododendron Root\n");
    }

    // تحديث Polished Driftwood
    const polished = await sql`
        SELECT id, name FROM products 
        WHERE LOWER(name) LIKE '%polished%' 
           OR LOWER(name) LIKE '%مصقول%'
           OR LOWER(name) LIKE '%ناعم%'
        LIMIT 1
    `;

    if (polished.length > 0) {
        console.log(`📦 تحديث: ${polished[0].name}`);
        await sql`
            UPDATE products 
            SET has_variants = true, variants = ${JSON.stringify(polishedVariants)}::jsonb
            WHERE id = ${polished[0].id}
        `;
        console.log(`   ✅ أضيف ${polishedVariants.length} مقاسات\n`);
    } else {
        console.log("⚠️ لم يتم العثور على Polished Driftwood\n");
    }

    // عرض كل منتجات الخشب الموجودة
    console.log("═══════════════════════════════════════════════════");
    console.log("📋 كل منتجات الخشب/الجذور في قاعدة البيانات:");
    console.log("═══════════════════════════════════════════════════\n");

    const allWood = await sql`
        SELECT id, name, has_variants 
        FROM products 
        WHERE LOWER(name) LIKE '%wood%'
           OR LOWER(name) LIKE '%خشب%'
           OR LOWER(name) LIKE '%جذ%'
           OR LOWER(name) LIKE '%أغصان%'
           OR LOWER(name) LIKE '%tree%'
           OR LOWER(name) LIKE '%شجرة%'
           OR LOWER(name) LIKE '%driftwood%'
           OR LOWER(name) LIKE '%غارق%'
           OR LOWER(name) LIKE '%صخري%'
           OR LOWER(name) LIKE '%مصقول%'
        ORDER BY name
    `;

    console.log(`📦 وجدت ${allWood.length} منتج:\n`);
    allWood.forEach((p, i) => {
        console.log(`${i + 1}. ${p.name}`);
        console.log(`   ID: ${p.id}`);
        console.log(`   has_variants: ${p.has_variants ? '✅' : '❌'}\n`);
    });

    console.log("✅ تم بنجاح!");
    process.exit(0);
}

updateWoodProducts().catch(e => {
    console.error("❌ Error:", e.message);
    process.exit(1);
});
