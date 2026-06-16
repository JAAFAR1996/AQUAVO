/**
 * البحث عن وتحديث منتج جذور الرودودندرون
 */

import { neon } from "@neondatabase/serverless";

const DATABASE_URL = "postgresql://neondb_owner:REDACTED_ROTATE_ME@ep-quiet-moon-a4h7tdze-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";
const sql = neon(DATABASE_URL);

async function findAndUpdateRhododendron() {
    console.log("🔍 البحث عن منتجات الرودودندرون...\n");

    // البحث عن كل المنتجات التي تحتوي على rhododendron أو رودودندرون
    const products = await sql`
        SELECT id, name, thumbnail, has_variants
        FROM products 
        WHERE LOWER(name) LIKE '%رودو%'
           OR LOWER(name) LIKE '%rhodo%'
           OR LOWER(name) LIKE '%جذور%'
           OR LOWER(name) LIKE '%ملتوية%'
        ORDER BY name
    `;

    console.log(`📦 وجدت ${products.length} منتج:\n`);
    products.forEach((p, i) => {
        console.log(`${i + 1}. ${p.name}`);
        console.log(`   ID: ${p.id}`);
        console.log(`   thumbnail: ${p.thumbnail || 'لا يوجد'}`);
        console.log(`   has_variants: ${p.has_variants ? '✅' : '❌'}\n`);
    });

    // تحديث كل منتج موجود
    const image = "/images/products/houyi/houyi-wood-products/thai-spider-wood.png";
    const description = `🌿 **جذور الرودودندرون الملتوية (Rhododendron Root)**

خشب طبيعي 100% من جذور شجرة الرودودندرون.

## 📏 **المقاس:**
- 30-35 سم

## ✨ **المميزات:**
- 🌿 فروع ملتوية بشكل طبيعي
- 🦐 آمن للأسماك والجمبري
- 🌱 مثالي لتثبيت الموس والنباتات
- 💧 تانين منخفض - لا يغير لون الماء كثيراً
- 🌊 بعد النقع يغرق طبيعياً`;

    for (const product of products) {
        console.log(`🔄 تحديث: ${product.name}...`);

        await sql`
            UPDATE products 
            SET 
                images = ${JSON.stringify([image])}::jsonb,
                thumbnail = ${image},
                description = ${description}
            WHERE id = ${product.id}
        `;

        console.log(`   ✅ تم تحديث الصورة والوصف!\n`);
    }

    console.log("═══════════════════════════════════════════════════");
    console.log("✅ تم بنجاح!");
    console.log("═══════════════════════════════════════════════════");

    process.exit(0);
}

findAndUpdateRhododendron().catch(e => {
    console.error("❌ Error:", e.message);
    process.exit(1);
});
