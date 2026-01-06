/**
 * تحديث منتج Mesh 8x8cm إلى اسم عربي مناسب
 * شبكة لحماية الموس وسد الفتحات
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

async function updateMeshProduct() {
    console.log("🔍 البحث عن منتج Mesh...\n");

    const products = await sql`
        SELECT id, name, description 
        FROM products 
        WHERE LOWER(name) LIKE '%mesh%' OR id LIKE '%mesh%'
    `;

    if (products.length === 0) {
        console.log("❌ لم يتم العثور على منتج Mesh");
        process.exit(1);
    }

    console.log(`✅ تم العثور على ${products.length} منتج:\n`);
    products.forEach(p => {
        console.log(`   - ID: ${p.id}`);
        console.log(`   - الاسم الحالي: ${p.name}`);
        console.log("---");
    });

    // الاسم والوصف الجديد
    const newName = "HOUYI شبكة ستانلس 8×8 سم - لحماية الموس والنباتات";
    const newDescription = `🌿 **شبكة ستانلس متعددة الاستخدامات للأحواض**

شبكة ستانلس ستيل عالية الجودة بمقاس 8×8 سم، مثالية لتثبيت الموس والنباتات في الحوض.

## 🌟 **الفوائد:**
- ✅ **تثبيت الموس** - اربط موس جافا أو غيره على الشبكة ليلتصق بها
- ✅ **سد الفتحات** - أمنع الأسماك من الهروب عبر فتحات الفلتر
- ✅ **ستانلس ستيل** - مقاوم للصدأ ويدوم طويلاً
- ✅ **سهل التشكيل** - يمكن ثنيه حسب الحاجة

## 📋 **الاستخدامات:**
- 🌱 تثبيت موس جافا (Java Moss) أو موس كريسماس
- 🚫 سد فتحة مدخل أو مخرج الفلتر
- 🦐 منع الجمبري الصغير من الدخول للفلتر
- 🎨 عمل أشكال طبيعية بالموس (شجرة، جدار أخضر)

## 💡 **طريقة الاستخدام:**
1. ضع الموس على الشبكة
2. اربطه بخيط قطني أو خيط صيد شفاف
3. ضعها في المكان المطلوب
4. خلال أسابيع سيلتصق الموس وينمو!

**المقاس:** 8×8 سم | **المادة:** ستانلس ستيل مقاوم للصدأ`;

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
    console.log("✅ تم تحديث منتج الشبكة بنجاح!");
    console.log("═══════════════════════════════════════");

    process.exit(0);
}

updateMeshProduct().catch(console.error);
