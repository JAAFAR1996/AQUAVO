/**
 * تحديث منتج فرشاة التنظيف المغناطيسية YEE
 */

import { neon } from "@neondatabase/serverless";

const DATABASE_URL = "postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(DATABASE_URL);

async function updateMagneticBrush() {
    const image = "/images/products/yee/yee-magnetic-brush/main.png";
    const description = `🧲 **فرشاة التنظيف المغناطيسية YEE (CLS-107)**

منظف زجاج مغناطيسي احترافي من YEE - الحجم الكبير!

## 📏 **المواصفات:**
- الموديل: CLS-107
- الحجم: كبير (Large)
- اللون: أزرق
- قوة المغناطيس: قوي جداً
- مناسب لزجاج: 8-15 مم

## ✨ **المميزات:**
- 🧲 مغناطيس قوي يمسك بإحكام
- 🧽 وسادة تنظيف ناعمة لا تخدش الزجاج
- 💧 ينظف من الخارج بدون تبليل يديك
- 🎯 سهل الاستخدام والتحكم
- 🔄 قطعتان مغناطيسيتان (داخلية وخارجية)

## 💡 **طريقة الاستخدام:**
1. ضع القطعة الداخلية داخل الحوض
2. ضع القطعة الخارجية من الخارج
3. حرّك القطعة الخارجية لتنظيف الطحالب
4. نظافة كريستالية بدون جهد!`;

    console.log("🔄 تحديث منتج فرشاة التنظيف المغناطيسية YEE...\n");

    const result = await sql`
        UPDATE products 
        SET 
            images = ${JSON.stringify([image])}::jsonb,
            thumbnail = ${image},
            description = ${description}
        WHERE slug LIKE '%cls-107%'
           OR slug LIKE '%c1s-107%'
           OR LOWER(name) LIKE '%مغناطيس%جبار%'
           OR LOWER(name) LIKE '%magnetic%brush%'
        RETURNING id, name
    `;

    if (result.length > 0) {
        console.log(`✅ تم تحديث: ${result[0].name}`);
        console.log(`   الصورة: ${image}`);
    } else {
        console.log("⚠️ لم يتم العثور على المنتج، جاري البحث...");
        const similar = await sql`
            SELECT id, name, slug FROM products 
            WHERE brand = 'YEE' AND category = 'الصيانة والتنظيف'
            LIMIT 10
        `;
        console.log("المنتجات المشابهة:");
        similar.forEach(p => console.log(`   - ${p.id}: ${p.name} (${p.slug})`));
    }

    console.log("\n✅ تم!");
    process.exit(0);
}

updateMagneticBrush().catch(e => {
    console.error("❌ Error:", e.message);
    process.exit(1);
});
