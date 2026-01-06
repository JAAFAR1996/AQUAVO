/**
 * إصلاح منتج اللصق - البحث عن كل منتجات اللصق وإضافة الخيارات
 */

import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    console.error("❌ DATABASE_URL not found");
    process.exit(1);
}

const sql = neon(DATABASE_URL);

async function fixGlueVariants() {
    console.log("🔍 البحث عن كل منتجات اللصق في قاعدة البيانات...\n");

    // البحث الشامل
    const allGlue = await sql`
        SELECT id, name, slug, brand, has_variants, variants
        FROM products 
        WHERE slug LIKE '%glue%' 
           OR slug LIKE '%instant%'
           OR LOWER(name) LIKE '%لصق%'
           OR LOWER(name) LIKE '%glue%'
        ORDER BY name
    `;

    console.log(`✅ وجدت ${allGlue.length} منتج:\n`);
    allGlue.forEach((p, i) => {
        console.log(`${i + 1}. ${p.name}`);
        console.log(`   - ID: ${p.id}`);
        console.log(`   - Slug: ${p.slug}`);
        console.log(`   - Brand: ${p.brand}`);
        console.log(`   - Has Variants: ${p.has_variants}`);
        console.log("");
    });

    if (allGlue.length === 0) {
        console.log("❌ لم يتم العثور على أي منتج لصق!");
        process.exit(1);
    }

    // الخيارات
    const glueVariants = [
        {
            id: "5g-green",
            label: "5 جرام - أخضر",
            price: 0,
            stock: 50,
            isDefault: false,
            specifications: { "الوزن": "5 جرام", "اللون": "أخضر" }
        },
        {
            id: "5g-white",
            label: "5 جرام - أبيض",
            price: 0,
            stock: 50,
            isDefault: false,
            specifications: { "الوزن": "5 جرام", "اللون": "أبيض" }
        },
        {
            id: "20g-white",
            label: "20 جرام - أبيض",
            price: 0,
            stock: 50,
            isDefault: false,
            specifications: { "الوزن": "20 جرام", "اللون": "أبيض" }
        },
        {
            id: "50g-clear",
            label: "50 جرام - شفاف (CA Liquid)",
            price: 0,
            stock: 50,
            isDefault: true,
            specifications: { "الوزن": "50 جرام", "اللون": "شفاف" }
        }
    ];

    // تحديث كل منتجات اللصق الموجودة
    console.log("═══════════════════════════════════════════════════");
    console.log("🔄 إضافة الخيارات لكل منتجات اللصق...");
    console.log("═══════════════════════════════════════════════════\n");

    for (const product of allGlue) {
        console.log(`📦 تحديث: ${product.name}`);
        console.log(`   ID: ${product.id}`);

        try {
            await sql`
                UPDATE products 
                SET 
                    has_variants = true,
                    variants = ${JSON.stringify(glueVariants)}::jsonb
                WHERE id = ${product.id}
            `;
            console.log(`   ✅ تم إضافة ${glueVariants.length} خيارات!`);
        } catch (error: any) {
            console.log(`   ❌ خطأ: ${error.message}`);
        }
        console.log("");
    }

    // التحقق
    console.log("═══════════════════════════════════════════════════");
    console.log("✅ التحقق من النتيجة:");
    console.log("═══════════════════════════════════════════════════\n");

    const verify = await sql`
        SELECT id, name, has_variants, 
               jsonb_array_length(variants) as variants_count
        FROM products 
        WHERE slug LIKE '%glue%' 
           OR slug LIKE '%instant%'
           OR LOWER(name) LIKE '%لصق%'
           OR LOWER(name) LIKE '%glue%'
    `;

    verify.forEach(p => {
        console.log(`📦 ${p.name}`);
        console.log(`   - has_variants: ${p.has_variants}`);
        console.log(`   - عدد الخيارات: ${p.variants_count || 0}`);
    });

    process.exit(0);
}

fixGlueVariants().catch(e => {
    console.error("❌ Error:", e.message);
    process.exit(1);
});
