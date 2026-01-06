/**
 * إضافة خيارات (أحجام وألوان) لمنتجات اللصق HOUYI
 * 
 * المنتجات من جدول المستخدم:
 * - Moss glue 5g green & White
 * - Moss Glue 20g White
 * - Instant Glue 50g (CA Liquid)
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

async function addGlueVariants() {
    console.log("🔍 البحث عن منتجات اللصق HOUYI...\n");

    // البحث عن منتجات اللصق
    const glueProducts = await sql`
        SELECT id, name, description, price, variants, has_variants
        FROM products 
        WHERE (LOWER(name) LIKE '%glue%' OR LOWER(name) LIKE '%لصق%')
          AND (LOWER(name) LIKE '%houyi%' OR LOWER(brand) = 'houyi')
    `;

    console.log(`✅ تم العثور على ${glueProducts.length} منتج لصق:\n`);
    glueProducts.forEach(p => {
        console.log(`   - ID: ${p.id}`);
        console.log(`   - الاسم: ${p.name}`);
        console.log(`   - لديه خيارات: ${p.has_variants ? 'نعم' : 'لا'}`);
        console.log("---");
    });

    // الخيارات الجديدة للصق الموس (moss glue) والـ Instant Glue
    const glueVariants = [
        // لصق الموس - أخضر
        {
            id: "5g-green",
            label: "5 جرام - أخضر",
            price: 0,  // السعر صفر للآن
            stock: 50,
            isDefault: false,
            specifications: {
                "الوزن": "5 جرام",
                "اللون": "أخضر",
                "النوع": "لصق موس"
            }
        },
        // لصق الموس - أبيض
        {
            id: "5g-white",
            label: "5 جرام - أبيض",
            price: 0,
            stock: 50,
            isDefault: false,
            specifications: {
                "الوزن": "5 جرام",
                "اللون": "أبيض",
                "النوع": "لصق موس"
            }
        },
        // 20 جرام - أبيض
        {
            id: "20g-white",
            label: "20 جرام - أبيض",
            price: 0,
            stock: 50,
            isDefault: false,
            specifications: {
                "الوزن": "20 جرام",
                "اللون": "أبيض",
                "النوع": "لصق موس"
            }
        },
        // 50 جرام - شفاف (Instant Glue / CA Liquid)
        {
            id: "50g-clear",
            label: "50 جرام - شفاف (CA Liquid)",
            price: 0,
            stock: 50,
            isDefault: true,
            specifications: {
                "الوزن": "50 جرام",
                "اللون": "شفاف",
                "النوع": "لصق فوري (CA)"
            }
        }
    ];

    // تحديث كل منتجات اللصق
    for (const product of glueProducts) {
        console.log(`\n🔄 تحديث: ${product.name}...`);

        // تحديث الاسم والوصف والخيارات
        const newName = "HOUYI لصق الأكوابيسكيب متعدد الأحجام";
        const newDescription = `🌿 **لصق احترافي لتثبيت الموس والنباتات**

لصق خاص بالأحواض، آمن للأسماك والنباتات، يجف تحت الماء فوراً!

## 🌟 **الأحجام والألوان المتوفرة:**
- ✅ **5 جرام - أخضر**: مثالي للموس الأخضر (يمتزج مع اللون)
- ✅ **5 جرام - أبيض**: للأحجار البيضاء والكورال
- ✅ **20 جرام - أبيض**: للمشاريع المتوسطة
- ✅ **50 جرام - شفاف (CA)**: لصق فوري قوي للمحترفين

## 📋 **الاستخدامات:**
- 🌱 تثبيت موس جافا وموس كريسماس
- 🪨 لصق نباتات على الصخور والخشب
- 🌊 يعمل تحت الماء مباشرة
- 🦐 آمن للجمبري والأسماك

## 💡 **مميزات:**
- ⚡ يجف في ثوانٍ
- 🔒 يدوم طويلاً
- 🌿 لا يضر النباتات
- 💧 يعمل حتى تحت الماء`;

        await sql`
            UPDATE products 
            SET 
                name = ${newName},
                description = ${newDescription},
                has_variants = true,
                variants = ${JSON.stringify(glueVariants)}::jsonb
            WHERE id = ${product.id}
        `;

        console.log(`   ✅ تم إضافة ${glueVariants.length} خيارات!`);
    }

    console.log("\n═══════════════════════════════════════");
    console.log("✅ تم إضافة الخيارات بنجاح!");
    console.log("═══════════════════════════════════════");
    console.log("\n📋 الخيارات المضافة:");
    glueVariants.forEach(v => {
        console.log(`   - ${v.label}`);
    });

    process.exit(0);
}

addGlueVariants().catch(console.error);
