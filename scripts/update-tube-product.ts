/**
 * تحديث منتج أنبوب المياه المقوى YEE
 */

import { neon } from "@neondatabase/serverless";

const DATABASE_URL = "postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(DATABASE_URL);

async function updateTubeProduct() {
    const image = "/images/products/yee/yee-reinforced-tube/main.png";
    const newName = "YEE أنبوب مياه مقوى 16 مم - مرونة ومتانة (1 متر)";
    const description = `💧 **أنبوب مياه مقوى YEE (16mm PVC Reinforced Hose)**

أنبوب مياه مرن ومتين من YEE، مصمم خصيصاً للأحواض المائية.

## 📏 **المواصفات:**
- القطر الخارجي: 16 مم
- القطر الداخلي: 12 مم
- الطول: 1 متر
- المادة: PVC مقوى شفاف

## ✨ **المميزات:**
- 💪 متين ومقاوم للالتواء
- 🔄 مرن وسهل التركيب
- 💧 شفاف لمراقبة تدفق الماء
- 🐟 آمن للأسماك - خالي من المواد الضارة
- ⏳ يدوم لسنوات بدون تشقق

## 💡 **الاستخدامات:**
- توصيل الفلاتر الخارجية
- ربط مضخات المياه
- أنظمة تغيير الماء
- توصيل المعدات المائية`;

    console.log("🔄 تحديث منتج أنبوب المياه المقوى YEE...\n");

    // البحث عن المنتج
    const result = await sql`
        UPDATE products 
        SET 
            name = ${newName},
            images = ${JSON.stringify([image])}::jsonb,
            thumbnail = ${image},
            description = ${description}
        WHERE slug LIKE '%yee-3656%'
           OR slug LIKE '%16mm%'
           OR LOWER(name) LIKE '%أنبوب%مقوى%'
           OR LOWER(name) LIKE '%16%مم%'
        RETURNING id, name
    `;

    if (result.length > 0) {
        console.log(`✅ تم تحديث: ${result[0].name}`);
        console.log(`   الصورة: ${image}`);
    } else {
        // بحث أوسع
        console.log("⚠️ لم يتم العثور، جاري البحث...");
        const allYee = await sql`
            SELECT id, name, slug FROM products 
            WHERE brand = 'YEE' 
            AND (LOWER(name) LIKE '%أنبوب%' OR LOWER(name) LIKE '%tube%' OR LOWER(name) LIKE '%مياه%')
            LIMIT 5
        `;
        console.log("المنتجات المشابهة:");
        allYee.forEach(p => console.log(`   - ${p.id}: ${p.name} (${p.slug})`));
    }

    console.log("\n✅ تم!");
    process.exit(0);
}

updateTubeProduct().catch(e => {
    console.error("❌ Error:", e.message);
    process.exit(1);
});
