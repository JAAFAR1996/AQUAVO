/**
 * إضافة منتج Thai Branches Peeled
 */

import { neon } from "@neondatabase/serverless";

const DATABASE_URL = "postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(DATABASE_URL);

async function addThaiBranches() {
    console.log("🔍 البحث عن Thai Branches Peeled...\n");

    const image = "/images/products/houyi/houyi-wood-products/thai-branches-peeled.png";
    const description = `🌿 **الأغصان التايلندية المقشرة (Thai Branches Peeled)**

أغصان تايلندية طبيعية مقشرة بعناية للحصول على مظهر نظيف وأنيق.

## 📏 **الوزن:**
- يُباع بالكيلو (KG)

## ✨ **المميزات:**
- 🌿 أغصان مقشرة بشكل طبيعي
- 🎨 لون ذهبي بني جميل
- 🌱 مثالي لتثبيت الموس والنباتات
- 🦐 آمن للأسماك والجمبري
- 🌲 مظهر شجرة طبيعي

## 💡 **الاستخدامات:**
- إنشاء أشجار الموس
- ديكور طبيعي للحوض
- تثبيت النباتات المائية`;

    // البحث عن المنتج
    const products = await sql`
        SELECT id, name FROM products 
        WHERE LOWER(name) LIKE '%thai%branch%'
           OR LOWER(name) LIKE '%تايلندية%مقشر%'
           OR LOWER(name) LIKE '%تايلاندية%'
        LIMIT 1
    `;

    if (products.length > 0) {
        console.log(`📦 تحديث: ${products[0].name}`);

        await sql`
            UPDATE products 
            SET 
                images = ${JSON.stringify([image])}::jsonb,
                thumbnail = ${image},
                description = ${description}
            WHERE id = ${products[0].id}
        `;

        console.log(`   ✅ تم تحديث الصورة والوصف!`);
    } else {
        console.log("⚠️ لم يتم العثور على المنتج، سأبحث بطريقة أخرى...");

        // بحث أوسع
        const allWood = await sql`
            SELECT id, name FROM products 
            WHERE LOWER(name) LIKE '%thai%'
               OR LOWER(name) LIKE '%تايلند%'
            ORDER BY name
        `;

        console.log("\n📋 المنتجات التي تحتوي على 'Thai':");
        allWood.forEach(p => console.log(`   - ${p.id}: ${p.name}`));
    }

    console.log("\n═══════════════════════════════════════════════════");
    console.log("✅ تم!");
    console.log("═══════════════════════════════════════════════════");

    process.exit(0);
}

addThaiBranches().catch(e => {
    console.error("❌ Error:", e.message);
    process.exit(1);
});
