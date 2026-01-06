/**
 * تحديث منتج Hose Clamp إلى اسم عربي مناسب
 * هذا المشبك مفيد لتعبئة الحوض والتحكم بتدفق الماء
 */

import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

// Load environment variables
config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error("❌ DATABASE_URL not found");
    process.exit(1);
}

const sql = neon(DATABASE_URL);

async function updateHoseClamp() {
    console.log("🔍 البحث عن منتج Hose Clamp...\n");

    // البحث عن المنتج
    const products = await sql`
        SELECT id, name, description, specifications 
        FROM products 
        WHERE LOWER(name) LIKE '%hose%' OR LOWER(name) LIKE '%clamp%' OR id LIKE '%hose-clamp%'
    `;

    if (products.length === 0) {
        console.log("❌ لم يتم العثور على منتج Hose Clamp");
        process.exit(1);
    }

    console.log(`✅ تم العثور على ${products.length} منتج:\n`);
    products.forEach(p => {
        console.log(`   - ID: ${p.id}`);
        console.log(`   - الاسم الحالي: ${p.name}`);
        console.log("---");
    });

    // الاسم والوصف الجديد
    const newName = "HOUYI مشبك تحكم بالماء - لتعبئة الحوض";
    const newDescription = `🔧 **مشبك تحكم بالتدفق للأحواض**

أداة ذكية للتحكم في تدفق الماء أثناء تعبئة أو تغيير ماء الحوض.

## 🌟 **الفوائد:**
- ✅ **تحكم سهل** - أوقف أو قلل تدفق الماء بسهولة
- ✅ **تعبئة آمنة** - لا انسكاب ولا فوضى
- ✅ **يناسب جميع الخراطيم** - قياس قابل للتعديل
- ✅ **متين** - بلاستيك مقوى مقاوم للماء

## 📋 **الاستخدامات:**
- 🚰 تعبئة الحوض من خرطوم الماء
- 🔄 تغيير الماء الجزئي
- 🧹 شفط الأوساخ من القاع
- 🔌 توصيل الفلتر الخارجي

## 💡 **نصيحة:**
مثالي لمن يستخدم خرطوم مباشر من الصنبور لتعبئة الحوض - أوقف التدفق عند الحاجة دون الذهاب للصنبور!`;

    const newSpecs = JSON.stringify({
        "اللون": "أزرق",
        "المادة": "بلاستيك مقوى",
        "القياس": "قابل للتعديل (12-25 ملم)",
        "الاستخدام": "تحكم بتدفق الماء",
        "العلامة التجارية": "HOUYI"
    });

    // تحديث المنتج
    for (const product of products) {
        console.log(`\n🔄 تحديث المنتج: ${product.id}...`);

        await sql`
            UPDATE products 
            SET 
                name = ${newName},
                description = ${newDescription}
            WHERE id = ${product.id}
        `;

        console.log(`   ✅ تم التحديث!`);
        console.log(`   📝 الاسم الجديد: ${newName}`);
    }

    console.log("\n═══════════════════════════════════════");
    console.log("✅ تم تحديث منتج مشبك الماء بنجاح!");
    console.log("═══════════════════════════════════════");

    process.exit(0);
}

updateHoseClamp().catch(console.error);
